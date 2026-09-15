# Multi-stage build for apps/web out of the pnpm workspace.
# Build context is the repository root: docker build -f Dockerfile .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo


FROM base AS deps
# Copy only the manifests first so the install layer survives source edits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/edge/package.json apps/edge/
COPY apps/ingest/package.json apps/ingest/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/analytics/package.json packages/analytics/
RUN pnpm install --frozen-lockfile


FROM deps AS build
COPY . .
# Next collects env at build time for the client bundle; NEXT_PUBLIC_* values that
# differ per environment are read at runtime instead (see lib/env.ts).
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @short/web build


FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# sharp needs libc++ for its prebuilt binaries on alpine.
RUN apk add --no-cache libstdc++ \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
