import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { listLinks, shortUrl } from "@/lib/links";
import { emptyQrForm } from "@/lib/qr-form";
import { requireWorkspace } from "@/lib/session";
import { QrDesigner, type QrLinkOption } from "../qr-designer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("qr");
  return { title: t("newTitle") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewQrPage({ searchParams }: { searchParams: SearchParams }) {
  const [context, t] = await Promise.all([requireWorkspace(), getTranslations("qr")]);
  const raw = await searchParams;
  const preselect = Array.isArray(raw.linkId) ? raw.linkId[0] : raw.linkId;

  const { items } = await listLinks(context.workspace.id, {
    status: "active",
    sort: "created_desc",
    page: 1,
    pageSize: 200,
  });

  const options: QrLinkOption[] = items.map((link) => ({
    id: link.id,
    label: `${link.hostname}/${link.slug}${link.title ? ` · ${link.title}` : ""}`,
    url: shortUrl(link.hostname, link.slug),
  }));

  const selected = options.find((option) => option.id === preselect) ?? options[0];

  return (
    <PanelShell
      title={t("newTitle")}
      crumbs={[{ label: context.workspace.name }, { label: t("title"), href: "/qr" }]}
    >
      <Hero
        variant="compact"
        eyebrow={t("designer")}
        title={t("designTitle")}
        description={t("designDesc")}
      />
      <QrDesigner
        mode="create"
        defaultValues={emptyQrForm(selected?.id ?? "")}
        links={options}
        canUseLogo={context.plan.features.qrLogo}
      />
    </PanelShell>
  );
}
