import type { Metadata } from "next";
import { Link2 } from "lucide-react";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, EmptyState, Hero } from "@/components/ui";
import { listLinks, shortUrl } from "@/lib/links";
import { emptyQrForm } from "@/lib/qr-form";
import { requireWorkspace } from "@/lib/session";
import { QrDesigner, type QrLinkOption } from "../qr-designer";

export const metadata: Metadata = { title: "New QR code" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewQrPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireWorkspace();
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

  if (options.length === 0) {
    return (
      <PanelShell
        title="New QR code"
        crumbs={[{ label: context.workspace.name }, { label: "QR codes", href: "/qr" }]}
      >
        <EmptyState
          icon={<Link2 className="size-5" />}
          title="Create a link first"
          description="A QR code always points at one of your short links, so the printed code can be re-targeted later."
          actions={
            <Button variant="primary" href="/links/new">
              Create a link
            </Button>
          }
        />
      </PanelShell>
    );
  }

  const selected = options.find((option) => option.id === preselect) ?? options[0];

  return (
    <PanelShell
      title="New QR code"
      crumbs={[{ label: context.workspace.name }, { label: "QR codes", href: "/qr" }]}
    >
      <Hero
        variant="compact"
        eyebrow="QR designer"
        title="Design a QR code"
        description="The code encodes the short link, so you can change where it goes without reprinting."
      />
      <QrDesigner
        mode="create"
        defaultValues={emptyQrForm(selected.id)}
        links={options}
        canUseLogo={context.plan.features.qrLogo}
      />
    </PanelShell>
  );
}
