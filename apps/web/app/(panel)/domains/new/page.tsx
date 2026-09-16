import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { cloudflareEnabled } from "@/lib/cloudflare";
import { requireWorkspace } from "@/lib/session";
import { AddDomainForm } from "../add-domain-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("domains");
  return { title: t("newTitle") };
}

export default async function NewDomainPage() {
  const [context, t, tn] = await Promise.all([
    requireWorkspace(),
    getTranslations("domains"),
    getTranslations("nav"),
  ]);

  return (
    <PanelShell
      title={t("newTitle")}
      crumbs={[{ label: context.workspace.name }, { label: tn("domains"), href: "/domains" }]}
    >
      <Hero variant="compact" title={t("newTitle")} description={t("newDesc")} />
      <AddDomainForm cloudflareConfigured={cloudflareEnabled()} />
    </PanelShell>
  );
}
