import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PLATFORM_ASSET_KINDS } from "@short/db/constants";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { getPlatformAsset, getPlatformBrand } from "@/lib/brand";
import { requireSuperadmin } from "@/lib/session";
import { BrandEditor } from "./brand-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.brand");
  return { title: t("metaTitle") };
}

export default async function AdminBrandPage() {
  await requireSuperadmin();
  const t = await getTranslations("admin.brand");
  const tNav = await getTranslations("admin.nav");
  const tn = await getTranslations("nav");
  const brand = await getPlatformBrand();
  const assets = await Promise.all(
    PLATFORM_ASSET_KINDS.map(async (kind) => ({
      kind,
      present: (await getPlatformAsset(kind)) !== null,
    })),
  );

  return (
    <PanelShell title={tn("admin-brand")} crumbs={[{ label: tNav("admin") }, { label: tn("admin-brand") }]}>
      <Hero
        eyebrow={tn("platform")}
        title={t("title")}
        description={t("description")}
      />
      <BrandEditor
        brand={brand}
        presentAssets={assets.filter((asset) => asset.present).map((asset) => asset.kind)}
      />
    </PanelShell>
  );
}
