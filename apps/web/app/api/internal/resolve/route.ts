import { KV_SCHEMA_VERSION, type BiopageKvRecord, type DomainKvRecord } from "@short/core";
import { and, biopages, domains, eq, getDb, links } from "@short/db";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { toKvRecord } from "@/lib/links";
import { workspaceOverClickQuota } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cold-start path for the redirect worker: it calls this on a KV miss and writes the
 * response back into KV, so only the first visitor after a deploy or eviction pays for it.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (token === "" || token !== serverEnv().INTERNAL_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { hostname?: unknown; slug?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const hostname = typeof body.hostname === "string" ? body.hostname.toLowerCase() : "";
  const slug = typeof body.slug === "string" ? body.slug : "";

  if (hostname === "") {
    return NextResponse.json({ error: "hostname is required" }, { status: 400 });
  }

  const db = getDb();
  const [domain] = await db.select().from(domains).where(eq(domains.hostname, hostname)).limit(1);

  if (!domain) {
    return NextResponse.json({ link: null, domain: null, biopage: null });
  }

  const domainRecord: DomainKvRecord = {
    v: KV_SCHEMA_VERSION,
    id: domain.id,
    workspaceId: domain.workspaceId,
    hostname: domain.hostname,
    status: domain.status,
    rootDestination: domain.rootDestination,
    notFoundDestination: domain.notFoundDestination,
  };

  if (slug === "") {
    return NextResponse.json({ link: null, domain: domainRecord, biopage: null });
  }

  const [link] = await db
    .select()
    .from(links)
    .where(and(eq(links.domainId, domain.id), eq(links.slug, slug)))
    .limit(1);

  if (link) {
    const record = toKvRecord(link, domain.hostname);
    record.overQuota = await workspaceOverClickQuota(link.workspaceId);
    return NextResponse.json({
      link: record,
      domain: domainRecord,
      biopage: null,
    });
  }

  const [biopage] = await db
    .select()
    .from(biopages)
    .where(and(eq(biopages.domainId, domain.id), eq(biopages.handle, slug.toLowerCase())))
    .limit(1);

  const biopageRecord: BiopageKvRecord | null = biopage
    ? {
        v: KV_SCHEMA_VERSION,
        id: biopage.id,
        workspaceId: biopage.workspaceId,
        handle: biopage.handle,
        published: biopage.published,
      }
    : null;

  return NextResponse.json({ link: null, domain: domainRecord, biopage: biopageRecord });
}
