import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");

// Next only loads apps/web/.env. Fill gaps from the repo-root file so OAuth
// and other secrets added there still reach the panel in local dev.
try {
  const rootEnv = readFileSync(path.join(repoRoot, ".env"), "utf8");
  for (const line of rootEnv.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq < 1) {
      continue;
    }
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
} catch {
  // Production images ship env through the process, not a repo-root file.
}

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
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default withNextIntl(nextConfig);
