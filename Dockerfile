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
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
