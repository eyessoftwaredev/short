import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneApp = join(webRoot, ".next/standalone/apps/web");
const staticSrc = join(webRoot, ".next/static");
const publicSrc = join(webRoot, "public");

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
