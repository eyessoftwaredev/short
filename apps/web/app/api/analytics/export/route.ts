import { NextResponse, type NextRequest } from "next/server";
import { loadBreakdownSet, loadSummary, loadTimeseries } from "@/lib/analytics";
import { getSessionContext } from "@/lib/session";
import { clampRangeToRetention, resolveRange } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_TYPES = ["click", "qr_scan", "bio_view", "bio_click"] as const;

export async function GET(request: NextRequest) {
  const context = await getSessionContext();
  if (!context?.workspace || !context.user.emailVerified) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const range = clampRangeToRetention(
    resolveRange(params.get("range") ?? undefined, params.get("from") ?? undefined, params.get("to") ?? undefined),
    context.plan.limits.retentionDays,
  );
  const includeBots = params.get("includeBots") === "1";
  const rawType = params.get("type");
  const eventType = EVENT_TYPES.find((type) => type === rawType);
  const rawLinkId = params.get("linkId");
  // Only narrows the workspace's own events, so an unknown hostname just exports nothing.
  const rawDomain = params.get("domain")?.trim().toLowerCase();
  const scope = {
    workspaceId: context.workspace.id,
    linkId: rawLinkId && UUID.test(rawLinkId) ? rawLinkId : undefined,
    hostname: rawDomain && rawDomain.length <= 253 ? rawDomain : undefined,
    from: range.from,
    to: range.to,
    includeBots,
    eventType,
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
        "cache-control": "private, no-store",
      },
    });
  }

  return NextResponse.json(payload, {
    headers: {
      "content-disposition": "attachment; filename=analytics.json",
      "cache-control": "private, no-store",
    },
  });
}
