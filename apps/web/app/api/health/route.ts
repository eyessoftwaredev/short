import { NextResponse } from "next/server";
import { getSql } from "@short/db";

export const dynamic = "force-dynamic";

/**
 * Container-level liveness probe used by the Dockerfile and the compose healthcheck.
 * Only Postgres is checked: it is the one dependency the app cannot serve a single
 * page without. The richer dependency matrix lives behind /admin/system.
 */
export async function GET() {
  try {
    await getSql()`SELECT 1`;
    return NextResponse.json({ status: "ok", uptime: Math.round(process.uptime()) });
  } catch (error) {
    return NextResponse.json(
      { status: "down", error: error instanceof Error ? error.message : "unknown" },
      { status: 503 },
    );
  }
}
