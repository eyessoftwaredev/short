import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { getLink, listLinks, shortUrl } from "@/lib/links";
import { emptyQrForm } from "@/lib/qr-form";
import { listQrTemplates } from "@/lib/qr-templates";
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

  const [{ items }, templates, preselected] = await Promise.all([
    listLinks(context.workspace.id, {
      status: "active",
      sort: "created_desc",
      page: 1,
      pageSize: 200,
    }),
    listQrTemplates(context.workspace.id),
    // "Design a custom code" from the link editor may point at an archived or older link
    // that the active list below does not include.
    preselect ? getLink(context.workspace.id, preselect) : Promise.resolve(null),
  ]);

  const options: QrLinkOption[] = items.map((link) => ({
    id: link.id,
    shortLabel: `${link.hostname}/${link.slug}`,
    title: link.title ?? null,
    url: shortUrl(link.hostname, link.slug),
    destination: link.destination,
  }));

  if (preselected && !options.some((option) => option.id === preselected.id)) {
    options.unshift({
      id: preselected.id,
      shortLabel: `${preselected.hostname}/${preselected.slug}`,
      title: preselected.title ?? null,
      url: shortUrl(preselected.hostname, preselected.slug),
      destination: preselected.destination,
    });
  }

  const selected = options.find((option) => option.id === preselect) ?? options[0];

  return (
    <PanelShell
      title={t("newTitle")}
      crumbs={[{ label: context.workspace.name }, { label: t("title"), href: "/qr" }]}
    >
      <QrDesigner
        mode="create"
        defaultValues={emptyQrForm(selected?.id ?? "")}
        links={options}
        canUseLogo={context.plan.features.qrLogo}
        templates={templates}
      />
    </PanelShell>
  );
}
