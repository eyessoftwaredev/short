import { isBiopageLive } from "@short/core";
import { and, biopages, eq, getDb, isNull } from "@short/db";
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

const MARKETING = ["/", "/pricing", "/terms", "/privacy", "/cookies"] as const;

function marketingOrigin(): string {
  try {
    return siteUrl().replace(/\/$/, "");
  } catch {
    return (process.env.SITE_URL || process.env.APP_URL || "https://short.ky").replace(/\/$/, "");
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = marketingOrigin();
  const pages: MetadataRoute.Sitemap = MARKETING.map((path, index) => ({
    url: path === "/" ? `${origin}/` : `${origin}${path}`,
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.4,
  }));

  try {
    const rows = await getDb()
      .select({
        handle: biopages.handle,
        updatedAt: biopages.updatedAt,
        published: biopages.published,
        publishAt: biopages.publishAt,
        unpublishAt: biopages.unpublishAt,
        sensitive: biopages.sensitive,
        passwordHash: biopages.passwordHash,
      })
      .from(biopages)
      .where(and(isNull(biopages.domainId), eq(biopages.published, true)));

    for (const row of rows) {
      if (row.sensitive || row.passwordHash || !isBiopageLive(row)) {
        continue;
      }
      pages.push({
        url: `${origin}/${row.handle}`,
        lastModified: row.updatedAt ?? undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("[sitemap] failed to list published bios", error);
  }

  return pages;
}
