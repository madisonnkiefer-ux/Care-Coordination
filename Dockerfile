# Multi-stage build producing a minimal runtime image for the ECS task
# defined in infra/ecs.tf. Build/push with:
#   docker build -t <ecr_repository_url>:latest .
#   docker push <ecr_repository_url>:latest

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
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
RUN npm run build

FROM node:22-alpine AS runner
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
# in the server bundle imports it, only `npx prisma` invokes it directly) —
# but infra/README.md's migration/seed path runs this same image with its
# command overridden to `npx prisma db push`/`db seed`. Pull in the full
# node_modules plus the schema so that override actually has something to run.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# schema.prisma's generator writes the client to app/generated/prisma (a
# source directory, not node_modules) — prisma/seed.ts imports it directly.
COPY --from=builder --chown=nextjs:nodejs /app/app/generated ./app/generated

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
