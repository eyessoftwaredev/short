import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PanelShell } from "@/components/shell/panel-shell";
import { listLinks, shortUrl } from "@/lib/links";
import { getQrCode } from "@/lib/qr-codes";
import { toQrForm } from "@/lib/qr-form";
import { listQrTemplates } from "@/lib/qr-templates";
import { requireWorkspace } from "@/lib/session";
import { QrDesigner, type QrLinkOption } from "../qr-designer";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [context, t, { id }] = await Promise.all([
    requireWorkspace(),
    getTranslations("qr"),
    params,
  ]);
  const record = await getQrCode(context.workspace.id, id);
  return { title: record ? `${record.name} · ${t("title")}` : t("editTitle") };
}

export default async function EditQrPage({ params }: { params: Params }) {
  const [context, t] = await Promise.all([requireWorkspace(), getTranslations("qr")]);
  const { id } = await params;

  const record = await getQrCode(context.workspace.id, id);
  if (!record) {
    notFound();
  }

  const [{ items }, templates] = await Promise.all([
    listLinks(context.workspace.id, {
      status: "all",
      sort: "created_desc",
      page: 1,
      pageSize: 200,
    }),
    listQrTemplates(context.workspace.id),
  ]);

  const options: QrLinkOption[] = items.map((link) => ({
    id: link.id,
    shortLabel: `${link.hostname}/${link.slug}`,
    title: link.title ?? null,
    url: shortUrl(link.hostname, link.slug),
    destination: link.destination,
  }));

  // The code's own link must stay selectable even when it is older than the newest 200.
  if (record.linkId && !options.some((option) => option.id === record.linkId)) {
    options.unshift({
      id: record.linkId,
      shortLabel: `${record.hostname}/${record.slug}`,
      title: null,
      url: shortUrl(record.hostname, record.slug),
      destination: record.destination,
    });
  }

  return (
    <PanelShell
      title={record.name}
      crumbs={[{ label: context.workspace.name }, { label: t("title"), href: "/qr" }]}
    >
      <QrDesigner
        mode="edit"
        qrId={record.id}
        defaultValues={toQrForm(record.name, record.linkId ?? "", record.style, {
          payloadKind: record.payloadKind,
          payload: record.payload,
        })}
        links={options}
        canUseLogo={context.plan.features.qrLogo}
        templates={templates}
      />
    </PanelShell>
  );
}
