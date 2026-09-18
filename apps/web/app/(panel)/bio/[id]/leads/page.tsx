import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Button,
  Card,
  EmptyState,
  Hero,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { getBiopage, listBioLeads } from "@/lib/biopages";
import { formatDate } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bio");
  return { title: t("leadsTitle") };
}

type Params = Promise<{ id: string }>;

export default async function BioLeadsPage({ params }: { params: Params }) {
  const context = await requireWorkspace();
  const { id } = await params;
  const [page, leads, t, tc, tn] = await Promise.all([
    getBiopage(context.workspace.id, id),
    listBioLeads(context.workspace.id, id),
    getTranslations("bio"),
    getTranslations("common"),
    getTranslations("nav"),
  ]);

  if (!page) {
    notFound();
  }

  const csv = [
    "email,createdAt",
    ...leads.map((row) => `${JSON.stringify(row.email)},${row.createdAt.toISOString()}`),
  ].join("\n");

  return (
    <PanelShell
      title={t("leadsTitle")}
      crumbs={[
        { label: context.workspace.name },
        { label: tn("bio"), href: "/bio" },
        { label: page.displayName, href: `/bio/${page.id}/edit` },
      ]}
      topbarActions={
        <Button href={`/bio/${page.id}/edit`}>
          <Icon name="pen" className="text-sm" />
          {tc("edit")}
        </Button>
      }
    >
      <Hero variant="compact" eyebrow={t("leadsTitle")} title={page.displayName} />

      {leads.length === 0 ? (
        <EmptyState
          icon={<Icon name="inbox" className="text-lg" />}
          title={t("leadsEmpty")}
          description={t("leadsEmptyDesc")}
        />
      ) : (
        <Card staticHover className="gap-4 overflow-x-auto">
          <Button
            size="sm"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            download={`${page.handle}-leads.csv`}
          >
            <Icon name="export" className="text-sm" />
            {t("leadsExport")}
          </Button>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("formEmail")}</TableHeaderCell>
                <TableHeaderCell>{t("leadCreated")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.email}</TableCell>
                  <TableCell className="font-mono text-xs">{formatDate(row.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PanelShell>
  );
}
