import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { getDb, getSql } from "./client";
import { user } from "./schema";

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const SUPERADMIN_ROLE = "superadmin";

function usage(): never {
  console.error("Usage: pnpm db:admin -- <email>");
  process.exit(1);
}

function parseEmail(argv: string[]): string {
  const email = argv.find((arg) => !arg.startsWith("-"))?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    usage();
  }
  return email;
}

async function main(): Promise<void> {
  const email = parseEmail(process.argv.slice(2));
  const db = getDb();

  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);

  if (!row) {
    throw new Error(`No user with email ${email}. Register first, then rerun.`);
  }

  await db
    .update(user)
    .set({
      role: SUPERADMIN_ROLE,
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(user.id, row.id));

  console.log(`Promoted ${row.email} to ${SUPERADMIN_ROLE} (was ${row.role}).`);
  if (!row.emailVerified) {
    console.log("Marked the address verified so they can open /admin.");
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await getSql().end({ timeout: 5 });
}
