import { getBreakdown } from "@short/analytics";
import { NextResponse, type NextRequest } from "next/server";
import { loadBreakdownSet, loadSummary, loadTimeseries } from "@/lib/analytics";
import { getBiopage } from "@/lib/biopages";
import { getSessionContext } from "@/lib/session";
import { clampRangeToRetention, resolveRange } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: string | number): string {
  const text = String(value);
  // Spreadsheet apps execute cells that start with these as formulas.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Stats export for one bio page. The workspace-wide analytics export does not know
 * about bio pages, so the bio stats page used to download the whole workspace's numbers.
 */
export async function GET(request: NextRequest) {
  const context = await getSessionContext();
  if (!context?.workspace || !context.user.emailVerified) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const page = await getBiopage(context.workspace.id, params.get("biopageId") ?? "");
  if (!page) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const range = clampRangeToRetention(
    resolveRange(
      params.get("range") ?? undefined,
      params.get("from") ?? undefined,
      params.get("to") ?? undefined,
    ),
    context.plan.limits.retentionDays,
  );
  const scope = {
    workspaceId: context.workspace.id,
    biopageId: page.id,
    from: range.from,
    to: range.to,
    includeBots: params.get("includeBots") === "1",
  };

  const [summary, timeseries, breakdowns, blocks] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope, 20),
    getBreakdown({ ...scope, eventType: "bio_click" }, "block", 50).catch(() => []),
  ]);

  const labels = new Map(
    page.blocks.map((block) => [
      block.id,
      block.type === "link"
        ? block.label
        : block.type === "header"
          ? block.text
          : block.type === "form"
            ? block.title || "form"
            : block.type,
    ]),
  );
  const blockRows = blocks.map((row) => ({
    blockId: row.key,
    label: labels.get(row.key) ?? "",
    taps: row.clicks,
    visitors: row.visitors,
  }));
  const filename = `${page.handle}-stats`;

  if (params.get("format") === "csv") {
    const lines = [
      ["bucket", "events", "visitors"].join(","),
      ...timeseries.map((point) => [point.bucket, point.clicks, point.visitors].map(csvCell).join(",")),
      "",
      ["block_id", "block", "taps", "visitors"].join(","),
      ...blockRows.map((row) => [row.blockId, row.label, row.taps, row.visitors].map(csvCell).join(",")),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=${filename}.csv`,
        "cache-control": "private, no-store",
      },
    });
  }

  return NextResponse.json(
    {
      page: { id: page.id, handle: page.handle, hostname: page.hostname },
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      summary: {
        views: summary.bioViews,
        taps: summary.bioClicks,
        visitors: summary.visitors,
        countries: summary.countries,
      },
      timeseries,
      blocks: blockRows,
      breakdowns,
    },
    {
      headers: {
        "content-disposition": `attachment; filename=${filename}.json`,
        "cache-control": "private, no-store",
      },
    },
  );
}
