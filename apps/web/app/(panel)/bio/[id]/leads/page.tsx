import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Grid,
  PageHeader,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { getBiopage, listBioLeads } from "@/lib/biopages";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bio");
  return { title: t("leadsTitle") };
}

type Params = Promise<{ id: string }>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Mirrors the cap in `listBioLeads`. */
const SHOWN_LIMIT = 500;

export default async function BioLeadsPage({ params }: { params: Params }) {
  const context = await requireWorkspace();
  const { id } = await params;
  const [page, leads, t, tc] = await Promise.all([
    getBiopage(context.workspace.id, id),
    listBioLeads(context.workspace.id, id),
    getTranslations("bio"),
    getTranslations("common"),
  ]);

  if (!page) {
    notFound();
  }

  const emailForms = page.blocks.filter((block) => block.type === "form" && block.mode === "email");
  const formTitles = new Map(
    page.blocks.flatMap((block) =>
      block.type === "form" ? [[block.id, block.title || t("leads.untitledForm")] as const] : [],
    ),
  );
  const now = Date.now();
  const lastWeek = leads.filter((lead) => now - lead.createdAt.getTime() < WEEK_MS).length;
  const latest = leads[0]?.createdAt ?? null;
  const canForms = context.plan.features.bioForms;
  const exportHref = `/api/bio/leads/export?biopageId=${page.id}`;

  return (
    <PanelShell
      title={t("leadsTitle")}
      crumbs={[
        { label: context.workspace.name },
        { label: t("title"), href: "/bio" },
        { label: page.displayName, href: `/bio/${page.id}/edit` },
      ]}
    >
      <PageHeader
        back={{ href: `/bio/${page.id}/edit`, label: page.displayName }}
        title={t("leadsTitle")}
        meta={leads.length > 0 ? <Badge tone="neutral">{formatNumber(leads.length)}</Badge> : null}
        description={t("leads.description")}
        actions={
          leads.length > 0 ? (
            <Button leadingIcon="download" href={exportHref} download={`${page.handle}-leads.csv`}>
              {t("leadsExport")}
            </Button>
          ) : null
        }
      />

      {!canForms && emailForms.length === 0 ? (
        <Callout
          tone="info"
          title={t("leads.lockedTitle")}
          actions={
            <Button size="sm" href="/billing" leadingIcon="rocket">
              {tc("seePlans")}
            </Button>
          }
        >
          {t("leads.lockedBody")}
        </Callout>
      ) : null}

      <Grid columns={3}>
        <StatCard
          icon="inbox"
          label={t("leads.total")}
          info={t("leads.totalInfo")}
          value={formatNumber(leads.length)}
          deltaLabel={leads.length >= SHOWN_LIMIT ? t("leads.shownLimit", { count: SHOWN_LIMIT }) : undefined}
        />
        <StatCard
          icon="calendar"
          label={t("leads.lastWeek")}
          info={t("leads.lastWeekInfo")}
          value={formatNumber(lastWeek)}
        />
        <StatCard
          icon="clock"
          label={t("leads.latest")}
          info={t("leads.latestInfo")}
          value={latest ? formatDate(latest) : "—"}
        />
      </Grid>

      <Card
        padding="none"
        title={t("leads.tableTitle")}
        description={t("leads.tableDesc")}
      >
        {leads.length === 0 ? (
          <EmptyState
            bare
            tone={emailForms.length === 0 ? "first-run" : "default"}
            icon="envelope"
            title={emailForms.length === 0 ? t("leads.noFormTitle") : t("leadsEmpty")}
            description={emailForms.length === 0 ? t("leads.noFormBody") : t("leads.emptyBody")}
            actions={
              emailForms.length === 0 ? (
                canForms ? (
                  <Button variant="primary" leadingIcon="plus" href={`/bio/${page.id}/edit?tab=content`}>
                    {t("leads.addForm")}
                  </Button>
                ) : null
              ) : (
                <Button leadingIcon="pen" href={`/bio/${page.id}/edit`}>
                  {t("leads.openBuilder")}
                </Button>
              )
            }
          />
        ) : (
          <Table bare stickyHeader label={t("leads.tableTitle")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("formEmail")}</TableHeaderCell>
                <TableHeaderCell className="hidden sm:table-cell">{t("leads.form")}</TableHeaderCell>
                <TableHeaderCell align="right">{t("leadCreated")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((row) => (
                <TableRow key={row.id}>
                  <TableCell truncate>
                    <a href={`mailto:${row.email}`} className="text-ink hover:text-accent-ink">
                      {row.email}
                    </a>
                  </TableCell>
                  <TableCell truncate className="hidden text-fg-muted sm:table-cell">
                    {formTitles.get(row.blockId) ?? t("leads.removedForm")}
                  </TableCell>
                  <TableCell align="right" className="numeric text-[13px] whitespace-nowrap text-fg-muted">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </PanelShell>
  );
}
