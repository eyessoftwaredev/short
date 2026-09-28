import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { isWithinLimit } from "@short/core";
import { BioThumbnail } from "@/components/bio/bio-thumbnail";
import { Icon, type IconName } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import { QueryPagination } from "@/components/shell/query-pagination";
import {
  Badge,
  Button,
  Callout,
  Card,
  CopyField,
  EmptyState,
  Grid,
  PageHeader,
} from "@/components/ui";
import { bioUrl, listBiopages } from "@/lib/biopages";
import { formatDate, formatNumber } from "@/lib/format";
import { getWorkspaceUsage } from "@/lib/quota";
import { requireWorkspace } from "@/lib/session";
import { BioCardMenu } from "./bio-card-menu";
import { BioStatusBadge } from "./bio-status";
import { bioStatusOf } from "./status";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bio");
  return { title: t("title") };
}

const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const HOW_IT_WORKS: { key: "stepLook" | "stepLinks" | "stepShare"; icon: IconName }[] = [
  { key: "stepLook", icon: "palette" },
  { key: "stepLinks", icon: "link" },
  { key: "stepShare", icon: "share-nodes" },
];

export default async function BioListPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocale();
  const [context, t, tc] = await Promise.all([
    requireWorkspace(),
    getTranslations("bio"),
    getTranslations("common"),
  ]);
  const raw = await searchParams;
  const pageParam = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const [{ items, total }, usage] = await Promise.all([
    listBiopages(context.workspace.id, page, PAGE_SIZE),
    getWorkspaceUsage(context.workspace.id),
  ]);

  const limit = context.plan.limits.biopages;
  const atLimit = !isWithinLimit(limit, usage.biopages);

  return (
    <PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]}>
      <PageHeader
        title={t("title")}
        meta={total > 0 ? <Badge tone="neutral">{formatNumber(total, locale)}</Badge> : null}
        description={t("list.description")}
        actions={
          <Button variant="primary" leadingIcon="plus" href="/bio/new">
            {t("newPage")}
          </Button>
        }
      />

      {atLimit && total > 0 ? (
        <Callout
          tone="warn"
          title={t("list.limitTitle", { limit: formatNumber(limit, locale), plan: context.plan.name })}
          actions={
            <Button size="sm" href="/billing" leadingIcon="rocket">
              {tc("seePlans")}
            </Button>
          }
        >
          {t("list.limitBody")}
        </Callout>
      ) : null}

      {total === 0 ? (
        <Card padding="lg" className="gap-8">
          <EmptyState
            bare
            tone="first-run"
            icon="address-card"
            title={t("list.emptyTitle")}
            description={t("list.emptyBody")}
            actions={
              <Button variant="primary" size="lg" leadingIcon="plus" href="/bio/new">
                {t("list.emptyCta")}
              </Button>
            }
            hint={t("list.emptyHint")}
            className="py-6"
          />
          <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <li
                key={step.key}
                className="flex min-w-0 gap-3 rounded-lg border border-border-subtle bg-surface-subtle p-4"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-md bg-bg text-accent shadow-xs ring-1 ring-border"
                  aria-hidden="true"
                >
                  <Icon name={step.icon} className="text-sm" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-ink">
                    {index + 1}. {t(`list.${step.key}`)}
                  </span>
                  <span className="text-[13px] leading-5 text-fg-muted">
                    {t(`list.${step.key}Body`)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon="address-card"
          title={t("list.pageEmptyTitle")}
          description={t("list.pageEmptyBody")}
          actions={
            <Button href="/bio" leadingIcon="arrow-left">
              {t("list.firstPage")}
            </Button>
          }
        />
      ) : (
        <>
          <Grid columns={3}>
            {items.map((item) => {
              const url = bioUrl(item.hostname, item.handle);
              const status = bioStatusOf(item);
              return (
                <Card
                  key={item.id}
                  padding="none"
                  className="group gap-0"
                  footer={
                    <>
                      <span className="flex min-w-0 flex-wrap items-center gap-1">
                        <Button size="sm" leadingIcon="pen" href={`/bio/${item.id}/edit`}>
                          {tc("edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          leadingIcon="chart-line"
                          href={`/bio/${item.id}/stats`}
                        >
                          {t("stats")}
                        </Button>
                        <Button size="sm" variant="ghost" leadingIcon="inbox" href={`/bio/${item.id}/leads`}>
                          {t("leadsTitle")}
                        </Button>
                      </span>
                      <BioCardMenu id={item.id} name={item.displayName} url={url} live={status === "live"} />
                    </>
                  }
                >
                  <Link
                    href={`/bio/${item.id}/edit`}
                    className="relative block h-44 overflow-hidden border-b border-border-subtle no-underline hover:no-underline"
                    aria-label={t("list.editNamed", { name: item.displayName })}
                  >
                    <BioThumbnail
                      displayName={item.displayName}
                      avatarUrl={item.avatarUrl}
                      profileMode={item.profileMode}
                      logoUrl={item.logoUrl}
                      profileText={item.profileText}
                      fontFamily={item.fontFamily}
                      theme={item.theme}
                      buttonStyle={item.buttonStyle}
                      bgType={item.bgType}
                      bgColor={item.bgColor}
                      bgGradient={item.bgGradient}
                      bgImageUrl={item.bgImageUrl}
                      buttonColor={item.buttonColor}
                      buttonTextColor={item.buttonTextColor}
                      textColor={item.textColor}
                      className="transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03]"
                    />
                    <span className="absolute top-3 left-3">
                      <BioStatusBadge status={status} />
                    </span>
                  </Link>

                  <div className="flex min-w-0 flex-col gap-3 p-4">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        href={`/bio/${item.id}/edit`}
                        className="truncate text-[15px] leading-6 font-semibold text-ink no-underline hover:text-accent-ink hover:no-underline"
                      >
                        {item.displayName}
                      </Link>
                      <span className="truncate text-[13px] text-fg-subtle">
                        {t("blocksCount", { count: item.blockCount })} ·{" "}
                        {t("list.updated", { date: formatDate(item.updatedAt, locale) })}
                      </span>
                    </div>
                    <CopyField
                      value={url}
                      size="sm"
                      href={status === "live" ? url : undefined}
                      copyLabel={t("copyUrl")}
                    />
                  </div>
                </Card>
              );
            })}
          </Grid>

          <QueryPagination page={page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </PanelShell>
  );
}
