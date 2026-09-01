# Multi-stage build producing a minimal runtime image for the ECS task
# defined in infra/ecs.tf. Build/push with:
#   docker build -t <ecr_repository_url>:latest .
#   docker push <ecr_repository_url>:latest
#
# Base image pulled from ECR Public's mirror rather than Docker Hub directly —
# Docker Hub's anonymous pull rate limit is shared across everyone on a given
# egress IP (real problem on CI runners, including CodeBuild's shared NAT).

FROM public.ecr.aws/docker/library/node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall runs `prisma generate`, which needs the schema present.
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npm ci

FROM public.ecr.aws/docker/library/node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma's new driver-adapter architecture (@prisma/adapter-pg) means the
# generated client needs no DATABASE_URL at build time — it only reads the
# schema to generate types, and connects at runtime via the adapter.
RUN npx prisma generate
# lib/session.ts reads SESSION_SECRET at module scope, so `next build`'s
# static page-data collection needs a value present. This one is discarded —
# it's server-only code, never inlined into the client bundle — the ECS task
# definition injects the real secret from Secrets Manager at container start.
ENV SESSION_SECRET="build-time-placeholder-not-used-at-runtime"
# Opts next.config.ts into `output: "standalone"` — only for this Docker
# build, since Vercel's own builder is incompatible with standalone output.
ENV DOCKER_BUILD="1"
# `npm run build` would also trigger the "prebuild" script (scripts/prebuild-db-sync.mjs),
# which connects directly to Postgres — not reachable from wherever this image
# is built, and not how this image applies schema changes anyway (see the
# migration/seed override note below). Call next build directly to skip it.
RUN npx next build

FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# rds.tf forces sslmode=require, which pg-connection-string treats as
# verify-full — Amazon RDS's CA chain isn't in Node's default trust store,
# so both the app and the migration/seed overrides need it explicitly.
COPY certs/rds-global-bundle.pem ./certs/rds-global-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/app/certs/rds-global-bundle.pem

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The standalone output's traced node_modules omits the Prisma CLI (nothing
# in the server bundle imports it, only `npx prisma`/scripts/prebuild-db-sync.mjs
# invoke it directly) — but infra/README.md's migration/seed path runs this
# same image with its command overridden to run those. Pull in the full
# node_modules plus the schema so that override actually has something to run.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# scripts/prebuild-db-sync.mjs works around a Prisma schema-engine bug
# (P1014) that a single-pass `prisma db push` can hit on this schema — the
# migration override should run this instead of a raw `db push`.
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# One-off read-only/admin scripts (e.g. scripts/validate-team-report.ts) run
# via this same command-override path and import real app logic from lib/
# using "@/..." aliases — the standalone server bundle doesn't expose lib/
# as importable source, so both it and tsconfig.json (tsx needs it to
# resolve those aliases outside a Next.js build) need to be here too.
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
# schema.prisma's generator writes the client to app/generated/prisma (a
# source directory, not node_modules) — prisma/seed.ts imports it directly.
COPY --from=builder --chown=nextjs:nodejs /app/app/generated ./app/generated

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
