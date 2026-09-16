#!/bin/sh
set -eu
apk add --no-cache git python3 make g++ libc6-compat
corepack enable
git clone --depth 1 https://github.com/eyessoftwaredev/short.git /repo
cd /repo
pnpm install --frozen-lockfile
pnpm --filter @short/web build
mkdir -p /repo/apps/web/.next/standalone/apps/web/.next
cp -a /repo/apps/web/.next/static /repo/apps/web/.next/standalone/apps/web/.next/static
cp -a /repo/apps/web/public /repo/apps/web/.next/standalone/apps/web/public
exec node /repo/apps/web/.next/standalone/apps/web/server.js
