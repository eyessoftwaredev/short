import { NextResponse, type NextRequest } from "next/server";
import { loadBreakdownSet, loadSummary, loadTimeseries } from "@/lib/analytics";
import { getSessionContext } from "@/lib/session";
import { clampRangeToRetention, resolveRange } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getSessionContext();
  if (!context?.workspace) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const range = clampRangeToRetention(
    resolveRange(params.get("range") ?? undefined, params.get("from") ?? undefined, params.get("to") ?? undefined),
    context.plan.limits.retentionDays,
  );
  const includeBots = params.get("includeBots") === "1";
  const eventType = params.get("type") as "click" | "qr_scan" | "bio_view" | "bio_click" | null;
  const scope = {
    workspaceId: context.workspace.id,
    linkId: params.get("linkId") ?? undefined,
    from: range.from,
    to: range.to,
    includeBots,
    eventType: eventType ?? undefined,
  };

  const [summary, timeseries, breakdowns] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope, 20),
  ]);

  const payload = { range: { from: range.from.toISOString(), to: range.to.toISOString() }, summary, timeseries, breakdowns };

  if (params.get("format") === "csv") {
    const lines = [
      "bucket,clicks,visitors",
      ...timeseries.map((point) => `${point.bucket},${point.clicks},${point.visitors}`),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=analytics.csv",
      },
    });
  }

  return NextResponse.json(payload, {
    headers: { "content-disposition": "attachment; filename=analytics.json" },
  });
}
