import { bioLeads, desc, eq, getDb } from "@short/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getBiopage } from "@/lib/biopages";
import { getSessionContext } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Upper bound for one download; far above what a bio page form collects in practice. */
const MAX_ROWS = 50_000;

function csvCell(value: string): string {
  // Spreadsheet apps execute cells that start with these as formulas.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Every lead of one bio page as CSV. The leads screen lists the latest 500; the
 * export is not capped at what happens to be on screen.
 */
export async function GET(request: NextRequest) {
  const context = await getSessionContext();
  if (!context?.workspace || !context.user.emailVerified) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const page = await getBiopage(context.workspace.id, request.nextUrl.searchParams.get("biopageId") ?? "");
  if (!page) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rows = await getDb()
    .select({ email: bioLeads.email, blockId: bioLeads.blockId, createdAt: bioLeads.createdAt })
    .from(bioLeads)
    .where(eq(bioLeads.biopageId, page.id))
    .orderBy(desc(bioLeads.createdAt))
    .limit(MAX_ROWS);

  const forms = new Map(
    page.blocks.flatMap((block) => (block.type === "form" ? [[block.id, block.title] as const] : [])),
  );
  const lines = [
    "email,form,captured_at",
    ...rows.map((row) =>
      [row.email, forms.get(row.blockId) ?? "", row.createdAt.toISOString()].map(csvCell).join(","),
    ),
  ];

  return new NextResponse(`﻿${lines.join("\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=${page.handle}-leads.csv`,
      "cache-control": "private, no-store",
    },
  });
}
