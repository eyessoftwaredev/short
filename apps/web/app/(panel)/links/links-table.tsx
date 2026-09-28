"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition, type ReactNode } from "react";
import type { LinkOpenMode } from "@short/core";
import { Icon, type IconName } from "@/components/kit/icon";
import {
  Badge,
  Button,
  ConfirmDialog,
  CopyButton,
  Dropdown,
  EmptyState,
  Pagination,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  toast,
  type DropdownItem,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { cn } from "@/lib/cx";
import { openQrCodeForLinkAction } from "../qr/actions";
import { archiveLinkAction, deleteLinkAction, duplicateLinkAction } from "./actions";
import { Favicon } from "./favicon";
import { displayUrl, type LinkStatus } from "./link-state";
import { BrokenBadge, LinkStatusBadge } from "./link-status";
import { LinksBulkBar } from "./links-bulk-bar";

export type LinkListRow = {
  id: string;
  hostname: string;
  slug: string;
  destination: string;
  title: string | null;
  tags: string[];
  status: LinkStatus;
  /** Scheduled go-live (ISO). */
  startsAt: string | null;
  broken: boolean;
  healthStatusCode: number | null;
  hasRules: boolean;
  hasAbTest: boolean;
  hasPassword: boolean;
  hasAppLinks: boolean;
  openMode: LinkOpenMode;
  folderName: string | null;
  createdAt: string;
  /** Lifetime clicks + QR scans; null when analytics could not be reached. */
  clicks: number | null;
  maxClicks: number | null;
};

type LinksTableProps = {
  rows: LinkListRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Any filter, search or a later page is active: an empty page means "no matches". */
  filtered: boolean;
  canDelete: boolean;
};

type Flag = { icon: IconName; label: string };

export function LinksTable({ rows, total, page, pageSize, filtered, canDelete }: LinksTableProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const ts = useTranslations("stats");
  const tq = useTranslations("qr");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<LinkListRow | null>(null);

  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);

  // Selection is per page: ids that left the page (pagination, filters, deletes) drop out.
  const selectedIds = useMemo(() => rows.filter((row) => selected.has(row.id)).map((row) => row.id), [rows, selected]);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  const toggleRow = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);
  const toggleAll = (checked: boolean): void => setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set());

  const goToPage = (next: number): void => {
    const query = new URLSearchParams(params.toString());
    if (next <= 1) {
      query.delete("page");
    } else {
      query.set("page", String(next));
    }
    startTransition(() => router.push(`/links?${query.toString()}`));
  };

  /** One row action at a time: marks the row busy so the click gets instant feedback. */
  const runRowAction = (row: LinkListRow, action: () => Promise<void>): void => {
    setBusyRowId(row.id);
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        console.error("link row action failed", error);
        toast.error(actionMessage("generic"));
      } finally {
        setBusyRowId(null);
      }
    });
  };

  const rowActions = (row: LinkListRow): DropdownItem[] => {
    const url = `https://${row.hostname}/${row.slug}`;
    const items: DropdownItem[] = [
      { id: "edit", label: t("list.menuEdit"), icon: <Icon name="pen" className="text-xs" />, href: `/links/${row.id}` },
      {
        id: "stats",
        label: t("list.menuStats"),
        icon: <Icon name="chart-line" className="text-xs" />,
        href: `/links/${row.id}/stats`,
      },
      {
        id: "preview",
        label: t("list.menuPreview"),
        description: t("list.menuPreviewHint"),
        icon: <Icon name="eye" className="text-xs" />,
        href: `${url}+`,
        external: true,
      },
      {
        id: "duplicate",
        label: t("table.duplicate"),
        icon: <Icon name="copy" className="text-xs" />,
        onSelect: () =>
          runRowAction(row, async () => {
            const result = await duplicateLinkAction(row.id);
            if (!result.ok) {
              toast.error(actionMessage(result.error));
              return;
            }
            toast.success(t("list.duplicated"));
            router.push(`/links/${result.data.id}`);
          }),
      },
      {
        id: "qr",
        label: tq("linkCard.menuItem"),
        icon: <Icon name="qrcode" className="text-xs" />,
        onSelect: () =>
          // Opens the newest code for this link, or creates one and opens that.
          runRowAction(row, async () => {
            const result = await openQrCodeForLinkAction(row.id);
            if (!result.ok) {
              toast.error(actionMessage(result.error));
              return;
            }
            router.push(`/qr/${result.data.id}`);
          }),
      },
      {
        id: "open",
        label: t("openDestination"),
        icon: <Icon name="external-link" className="text-xs" />,
        href: row.destination,
        external: true,
      },
      {
        id: "archive",
        label: row.status === "archived" ? tc("restore") : tc("archive"),
        description: row.status === "archived" ? t("list.restoreHint") : t("list.archiveHint"),
        icon: <Icon name={row.status === "archived" ? "archive-restore" : "archive"} className="text-xs" />,
        separated: true,
        onSelect: () =>
          runRowAction(row, async () => {
            const archiving = row.status !== "archived";
            const result = await archiveLinkAction(row.id, archiving);
            if (!result.ok) {
              toast.error(actionMessage(result.error));
              return;
            }
            toast.success(archiving ? t("list.archived") : t("list.restored"));
            router.refresh();
          }),
      },
    ];
    if (canDelete) {
      items.push({
        id: "delete",
        label: tc("delete"),
        icon: <Icon name="trash" className="text-xs" />,
        danger: true,
        onSelect: () => setDeleteTarget(row),
      });
    }
    return items;
  };

  const flagsOf = (row: LinkListRow): Flag[] => {
    const flags: Flag[] = [];
    if (row.hasPassword) {
      flags.push({ icon: "lock", label: t("flagPassword") });
    }
    if (row.hasRules) {
      flags.push({ icon: "sliders", label: t("flagRules") });
    }
    if (row.hasAbTest) {
      flags.push({ icon: "layer-group", label: t("list.flagAbTest") });
    }
    if (row.hasAppLinks || row.openMode !== "auto") {
      flags.push({ icon: "mobile-screen", label: t("list.flagApp") });
    }
    return flags;
  };

  const menu = (row: LinkListRow): ReactNode => (
    <Dropdown
      label={t("rowActions", { slug: row.slug })}
      items={rowActions(row)}
      trigger={
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label={t("rowActions", { slug: row.slug })}
          loading={busyRowId === row.id}
        >
          <Icon name="ellipsis" className="text-sm" />
        </Button>
      }
    />
  );

  const shortLink = (row: LinkListRow): ReactNode => (
    <span className="flex min-w-0 items-center gap-0.5">
      <Link
        href={`/links/${row.id}/stats`}
        className="flex min-w-0 font-mono text-[13px] text-ink no-underline hover:text-accent-ink hover:no-underline"
        title={t("list.openDetails")}
      >
        {/* The host is the same on most rows, so it gives way first and the slug that
            tells links apart stays readable. */}
        <span className="min-w-[5ch] shrink-10 truncate text-fg-subtle">{row.hostname}/</span>
        <span className="min-w-0 truncate font-medium">{row.slug}</span>
      </Link>
      <CopyButton value={`https://${row.hostname}/${row.slug}`} label={t("copyShortLink")} iconOnly className="size-7" />
    </span>
  );

  const destination = (row: LinkListRow): ReactNode => {
    const shown = displayUrl(row.destination);
    return (
      <span className="flex min-w-0 items-baseline text-[13px]" title={row.destination}>
        <span className="shrink-0 text-ink">{shown.host}</span>
        <span className="min-w-0 truncate text-fg-subtle">{shown.rest}</span>
      </span>
    );
  };

  const meta = (row: LinkListRow): ReactNode =>
    row.folderName || row.tags.length > 0 ? (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {row.folderName ? (
          <Badge tone="neutral" size="sm">
            <Icon name="folder" className="mr-1 text-[9px]" />
            {row.folderName}
          </Badge>
        ) : null}
        {row.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} tone="neutral" size="sm">
            #{tag}
          </Badge>
        ))}
        {row.tags.length > 2 ? (
          <span className="numeric text-[11px] text-fg-subtle" title={row.tags.slice(2).join(", ")}>
            +{row.tags.length - 2}
          </span>
        ) : null}
      </span>
    ) : null;

  const statusCell = (row: LinkListRow): ReactNode => {
    const flags = flagsOf(row);
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <LinkStatusBadge status={row.status} size="sm" />
        {row.broken ? <BrokenBadge statusCode={row.healthStatusCode} size="sm" /> : null}
        {flags.map((flag) => (
          <span key={flag.icon} title={flag.label} className="inline-flex text-fg-subtle">
            <Icon name={flag.icon} className="text-[11px]" />
            <span className="sr-only">{flag.label}</span>
          </span>
        ))}
      </span>
    );
  };

  const clicksCell = (row: LinkListRow, align: "end" | "start" = "end"): ReactNode => {
    if (row.clicks == null) {
      return (
        <span className="text-fg-subtle" title={t("list.clicksUnavailable")}>
          —
        </span>
      );
    }
    const clicks = row.clicks;
    const limit = row.maxClicks;
    return (
      <span className={cn("flex flex-col gap-1", align === "end" ? "items-end" : "items-start")}>
        <span className={cn("numeric", clicks === 0 && "text-fg-subtle")}>{numberFormat.format(clicks)}</span>
        {limit != null ? (
          <span className="flex items-center gap-1.5" title={t("list.limitTitle", { used: clicks, limit })}>
            <Progress
              value={clicks}
              max={Math.max(limit, 1)}
              size="sm"
              animate={false}
              tone={clicks >= limit ? "danger" : clicks / limit >= 0.85 ? "warn" : "accent"}
              className="w-12"
            />
            <span className="numeric font-sans text-[11px] text-fg-subtle">
              {t("list.ofLimit", { limit: numberFormat.format(limit) })}
            </span>
          </span>
        ) : null}
      </span>
    );
  };

  if (rows.length === 0) {
    return filtered ? (
      <EmptyState
        icon="search"
        title={t("emptyFilteredTitle")}
        description={t("emptyFilteredBody")}
        actions={
          <Button leadingIcon="xmark" onClick={() => startTransition(() => router.push("/links"))}>
            {t("clearFilters")}
          </Button>
        }
      />
    ) : (
      <EmptyState
        tone="first-run"
        icon="link"
        title={t("emptyTitle")}
        description={t("emptyBody")}
        actions={
          <Button variant="primary" leadingIcon="plus" href="/links/new">
            {t("createFirst")}
          </Button>
        }
        hint={t("emptyHint")}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Phones: one card per link. The table below needs more width than a phone has. */}
      <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden" aria-label={t("list.tableLabel")}>
        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(
              "flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-bg p-4 shadow-card",
              (selected.has(row.id) || busyRowId === row.id) && "border-accent-border bg-accent-tint",
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                className="mt-2"
                aria-label={t("table.selectRow", { slug: row.slug })}
                checked={selected.has(row.id)}
                onChange={(event) => toggleRow(row.id, event.target.checked)}
              />
              <Favicon url={row.destination} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {shortLink(row)}
                {row.title ? <span className="truncate text-[13px] text-ink">{row.title}</span> : null}
                {destination(row)}
              </div>
              {menu(row)}
            </div>
            {meta(row)}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
              {statusCell(row)}
              <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                <Icon name="arrow-pointer" className="text-[11px] text-fg-subtle" />
                {clicksCell(row, "start")}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden min-w-0 md:block">
        {/*
          Sticky header: the column a figure belongs to has to stay on screen
          when a full page of 25 rows scrolls past it.
        */}
        <Table stickyHeader pending={pending} label={t("list.tableLabel")}>
          <TableHead sticky>
            <TableRow>
              <TableHeaderCell className="w-10">
                <input
                  type="checkbox"
                  aria-label={t("table.selectPage")}
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = selectedIds.length > 0 && !allSelected;
                    }
                  }}
                  onChange={(event) => toggleAll(event.target.checked)}
                />
              </TableHeaderCell>
              <TableHeaderCell>{t("shortLink")}</TableHeaderCell>
              <TableHeaderCell className="hidden lg:table-cell">{ts("destination")}</TableHeaderCell>
              <TableHeaderCell numeric className="w-28">
                <span title={t("list.clicksHeaderHint")}>{ts("clicks")}</span>
              </TableHeaderCell>
              <TableHeaderCell className="w-44">{t("colStatus")}</TableHeaderCell>
              <TableHeaderCell className="hidden w-32 xl:table-cell">{t("colCreated")}</TableHeaderCell>
              <TableHeaderCell className="w-12">
                <span className="sr-only">{t("list.actionsHeader")}</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} selected={busyRowId === row.id || selected.has(row.id)}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={t("table.selectRow", { slug: row.slug })}
                    checked={selected.has(row.id)}
                    onChange={(event) => toggleRow(row.id, event.target.checked)}
                  />
                </TableCell>
                <TableCell className="max-w-0">
                  <span className="flex min-w-0 items-center gap-3">
                    <Favicon url={row.destination} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {shortLink(row)}
                      {row.title ? (
                        <span className="truncate text-[13px] text-fg-muted">{row.title}</span>
                      ) : (
                        <span className="lg:hidden">{destination(row)}</span>
                      )}
                      {row.title ? <span className="lg:hidden">{destination(row)}</span> : null}
                      {meta(row)}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="hidden max-w-0 lg:table-cell">{destination(row)}</TableCell>
                <TableCell numeric>{clicksCell(row)}</TableCell>
                <TableCell>{statusCell(row)}</TableCell>
                <TableCell className="numeric hidden whitespace-nowrap text-[13px] text-fg-muted xl:table-cell">
                  {dateFormat.format(new Date(row.createdAt))}
                </TableCell>
                <TableCell align="right">{menu(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedIds.length > 0 ? (
        <LinksBulkBar
          selectedIds={selectedIds}
          canDelete={canDelete}
          onClear={() => setSelected(new Set())}
          onDone={(message) => {
            toast.success(message);
            setSelected(new Set());
            router.refresh();
          }}
          onError={(message) => toast.error(message)}
        />
      ) : null}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        pending={pending}
        itemLabel={t("itemLabel")}
        onPageChange={goToPage}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title={t("list.deleteTitle", { slug: deleteTarget?.slug ?? "" })}
        description={t("list.deleteBody")}
        confirmLabel={t("list.deleteConfirm")}
        loading={busyRowId != null && busyRowId === deleteTarget?.id}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const row = deleteTarget;
          if (!row) {
            return;
          }
          runRowAction(row, async () => {
            const result = await deleteLinkAction(row.id);
            setDeleteTarget(null);
            if (!result.ok) {
              toast.error(actionMessage(result.error));
              return;
            }
            toast.success(t("list.deleted", { slug: row.slug }));
            router.refresh();
          });
        }}
      />
    </div>
  );
}
