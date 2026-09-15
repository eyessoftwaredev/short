#!/bin/sh
set -eu
apk add --no-cache git python3 make g++ libc6-compat
corepack enable
git clone --depth 1 https://github.com/eyessoftwaredev/short.git /repo
cd /repo
pnpm install --frozen-lockfile
pnpm --filter @short/web build
exec pnpm --filter @short/web exec next start --port 3000
