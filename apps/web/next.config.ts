import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Coolify builds the container from infra/Dockerfile, which copies .next/standalone.
  output: "standalone",
  transpilePackages: ["@short/core", "@short/db", "@short/analytics"],
  turbopack: {
    root: repoRoot,
  },
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ["sharp", "ioredis", "postgres"],
  // Loading the dev panel over the loopback IP instead of `localhost` otherwise has its
  // /_next/* requests blocked, which leaves the page rendered but never hydrated.
  allowedDevOrigins: ["127.0.0.1", "[::1]"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default withNextIntl(nextConfig);
