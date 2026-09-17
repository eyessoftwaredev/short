import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, Hero } from "@/components/ui";
import { listLinks, shortUrl } from "@/lib/links";
import { getQrCode } from "@/lib/qr-codes";
import { toQrForm } from "@/lib/qr-form";
import { requireWorkspace } from "@/lib/session";
import { QrDesigner, type QrLinkOption } from "../qr-designer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("qr");
  return { title: t("editTitle") };
}

type Params = Promise<{ id: string }>;

export default async function EditQrPage({ params }: { params: Params }) {
  const [context, t] = await Promise.all([requireWorkspace(), getTranslations("qr")]);
  const { id } = await params;

  const record = await getQrCode(context.workspace.id, id);
  if (!record) {
    notFound();
  }

  const { items } = await listLinks(context.workspace.id, {
    status: "all",
    sort: "created_desc",
    page: 1,
    pageSize: 200,
  });

  const options: QrLinkOption[] = items.map((link) => ({
    id: link.id,
    label: `${link.hostname}/${link.slug}${link.title ? ` · ${link.title}` : ""}`,
    url: shortUrl(link.hostname, link.slug),
  }));

  if (record.linkId && !options.some((option) => option.id === record.linkId)) {
    options.unshift({
      id: record.linkId,
      label: `${record.hostname}/${record.slug}`,
      url: shortUrl(record.hostname, record.slug),
    });
  }

  return (
    <PanelShell
      title={record.name}
      crumbs={[{ label: context.workspace.name }, { label: t("title"), href: "/qr" }]}
      topbarActions={
        record.linkId ? (
          <Button href={`/links/${record.linkId}/stats`}>
            <Icon name="chart-line" className="text-sm" />
            {t("scanStats")}
          </Button>
        ) : undefined
      }
    >
      <Hero
        variant="compact"
        eyebrow={t("designer")}
        title={record.name}
        description={t("encodes", { url: shortUrl(record.hostname, record.slug) })}
      />
      <QrDesigner
        mode="edit"
        qrId={record.id}
        defaultValues={toQrForm(record.name, record.linkId ?? "", record.style, {
          payloadKind: record.payloadKind,
          payload: record.payload,
        })}
        links={options}
        canUseLogo={context.plan.features.qrLogo}
      />
    </PanelShell>
  );
}
