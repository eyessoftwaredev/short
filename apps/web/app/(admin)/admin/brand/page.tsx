import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PLATFORM_ASSET_KINDS } from "@short/db/constants";
import { PanelShell } from "@/components/shell/panel-shell";
import { PageHeader } from "@/components/ui";
import { getPlatformAsset, getPlatformBrand } from "@/lib/brand";
import { brandAssetUrl } from "@/lib/brand-assets";
import { requireSuperadmin } from "@/lib/session";
import { BrandEditor, type BrandAssetView } from "./brand-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.brand");
  return { title: t("metaTitle") };
}

export default async function AdminBrandPage() {
  await requireSuperadmin();
  const [t, tNav] = await Promise.all([getTranslations("admin.brand"), getTranslations("admin.nav")]);
  const brand = await getPlatformBrand();
  const assets: BrandAssetView[] = await Promise.all(
    PLATFORM_ASSET_KINDS.map(async (kind) => {
      const asset = await getPlatformAsset(kind);
      return {
        kind,
        present: asset !== null,
        // Versioned by upload time: the route caches for a day, so a fixed URL kept
        // showing the previous image after a re-upload.
        src: asset ? brandAssetUrl(kind, asset.updatedAt) : null,
      };
    }),
  );

  return (
    <PanelShell title={t("title")} crumbs={[{ label: tNav("admin"), href: "/admin" }]}>
      <PageHeader title={t("title")} description={t("description")} />
      <BrandEditor brand={brand} assets={assets} />
    </PanelShell>
  );
}
