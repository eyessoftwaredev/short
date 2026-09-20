import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(webRoot, "../..");
const standaloneRoot = join(webRoot, ".next/standalone");
const standaloneApp = join(standaloneRoot, "apps/web");
const staticSrc = join(webRoot, ".next/static");
const publicSrc = join(webRoot, "public");
const drizzleSrc = join(repoRoot, "packages/db/drizzle");
const drizzleDest = join(standaloneRoot, "packages/db/drizzle");

if (!existsSync(standaloneApp)) {
  process.exit(0);
}

mkdirSync(join(standaloneApp, ".next"), { recursive: true });
if (existsSync(staticSrc)) {
  cpSync(staticSrc, join(standaloneApp, ".next/static"), { recursive: true });
}
if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(standaloneApp, "public"), { recursive: true });
}
if (existsSync(drizzleSrc)) {
  cpSync(drizzleSrc, drizzleDest, { recursive: true });
}
