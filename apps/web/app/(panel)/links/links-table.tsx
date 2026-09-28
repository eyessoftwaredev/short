"use client";

import { Icon } from "@/components/kit/icon";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { StatusBadge } from "@/components/shell/status-badge";
import {
  Badge,
  Button,
  CopyButton,
  Dropdown,
  EmptyState,
  FilterBar,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type DropdownItem,
  type FilterOption,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { cn } from "@/lib/cx";
import { openQrCodeForLinkAction } from "../qr/actions";
import { archiveLinkAction, deleteLinkAction, duplicateLinkAction } from "./actions";
import { LinksBulkBar } from "./links-bulk-bar";

export type LinkListRow = {
  id: string;
  hostname: string;
  slug: string;
  destination: string;
  title: string | null;
  tags: string[];
  archived: boolean;
  expired: boolean;
  hasRules: boolean;
  hasPassword: boolean;
  createdAt: string;
  clicks: number;
  /** Scheduled go-live (ISO); the link redirects only from this moment on. */
  startsAt?: string | null;
};

type StatusFilter = "all" | "active" | "archived" | "expired" | "scheduled";

function isScheduled(row: LinkListRow, now: number): boolean {
  return !row.archived && row.startsAt != null && new Date(row.startsAt).getTime() > now;
}

const columnHelper = createColumnHelper<LinkListRow>();

/**
 * Explicit widths on the fixed-size columns leave the remainder to the two
 * text columns, which then truncate instead of pushing the actions off-screen.
 */
const COLUMN_WIDTHS: Record<string, string> = {
  select: "w-10",
  flags: "w-16",
  tags: "w-44",
  clicks: "w-24",
  archived: "w-28",
  createdAt: "w-32",
  actions: "w-12",
};

const NUMERIC_COLUMNS = new Set(["clicks"]);

/** Columns dropped on small screens so slug + clicks stay readable without the sidebar. */
const COLUMN_RESPONSIVE: Record<string, string> = {
  destination: "hidden md:table-cell",
  tags: "hidden lg:table-cell",
  archived: "hidden sm:table-cell",
  createdAt: "hidden lg:table-cell",
};

type LinksTableProps = {
  rows: LinkListRow[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  status: StatusFilter;
  /** A folder chip is active; an empty page is then "no matches", not "no links yet". */
  folderFiltered?: boolean;
  canDelete: boolean;
};

export function LinksTable({
  rows,
  total,
  page,
  pageSize,
  search,
  status,
  folderFiltered = false,
  canDelete,
}: LinksTableProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const ts = useTranslations("stats");
  const tn = useTranslations("nav");
  const tq = useTranslations("qr");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const actionMessage = useActionMessage();

  // Selection is per page: ids that left the page (pagination, filters, deletes) drop out.
  const selectedIds = useMemo(
    () => rows.filter((row) => selected.has(row.id)).map((row) => row.id),
    [rows, selected],
  );
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
  const toggleAll = useCallback(
    (checked: boolean) => setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set()),
    [rows],
  );
  // Captured once per mount; "scheduled" only needs minute-level accuracy.
  const [now] = useState(() => Date.now());

  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale],
  );

  const statusOptions: FilterOption<StatusFilter>[] = [
    { id: "all", label: t("statusAll") },
    { id: "active", label: t("statusActive") },
    { id: "archived", label: t("statusArchived") },
    { id: "expired", label: t("statusExpired") },
    { id: "scheduled", label: t("statusScheduled") },
  ];

  /** Every filter lives in the URL so the list is shareable and survives a refresh. */
  const navigate = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (!("page" in patch)) {
        next.delete("page");
      }
      startTransition(() => router.push(`/links?${next.toString()}`));
    },
    [params, router],
  );

  const rowActions = useCallback(
    (row: LinkListRow): DropdownItem[] => {
      const items: DropdownItem[] = [
        {
          id: "edit",
          label: tc("edit"),
          icon: <Icon name="pen" className="text-sm" />,
          href: `/links/${row.id}`,
        },
        {
          id: "stats",
          label: ts("statistics"),
          icon: <Icon name="chart-line" className="text-sm" />,
          href: `/links/${row.id}/stats`,
        },
        {
          id: "duplicate",
          label: t("table.duplicate"),
          icon: <Icon name="copy" className="text-sm" />,
          onSelect: () => {
            setBusyRowId(row.id);
            setActionError(null);
            startTransition(async () => {
              try {
                const result = await duplicateLinkAction(row.id);
                if (!result.ok) {
                  setActionError(actionMessage(result.error));
                  return;
                }
                router.push(`/links/${result.data.id}`);
              } catch (error) {
                console.error("failed to duplicate link", error);
                setActionError(actionMessage("generic"));
              } finally {
                setBusyRowId(null);
              }
            });
          },
        },
        {
          id: "qr",
          label: tq("linkCard.menuItem"),
          icon: <Icon name="qrcode" className="text-sm" />,
          onSelect: () => {
            // Opens the newest code for this link, or creates one and opens that.
            setBusyRowId(row.id);
            setActionError(null);
            startTransition(async () => {
              try {
                const result = await openQrCodeForLinkAction(row.id);
                if (!result.ok) {
                  setActionError(actionMessage(result.error));
                  return;
                }
                router.push(`/qr/${result.data.id}`);
              } catch (error) {
                console.error("failed to open QR code for link", error);
                setActionError(actionMessage("generic"));
              } finally {
                setBusyRowId(null);
              }
            });
          },
        },
        {
          id: "open",
          label: t("openDestination"),
          icon: <Icon name="external-link" className="text-sm" />,
          href: row.destination,
          external: true,
        },
        {
          id: "archive",
          label: row.archived ? tc("restore") : tc("archive"),
          icon: row.archived ? (
            <Icon name="archive-restore" className="text-sm" />
          ) : (
            <Icon name="archive" className="text-sm" />
          ),
          separated: true,
          onSelect: () => {
            // Marking the row busy gives the click an immediate acknowledgement;
            // the table-wide pending state alone reads as the page freezing.
            setBusyRowId(row.id);
            setActionError(null);
            startTransition(async () => {
              try {
                const result = await archiveLinkAction(row.id, !row.archived);
                if (!result.ok) {
                  setActionError(actionMessage(result.error));
                  return;
                }
                router.refresh();
              } catch (error) {
                console.error("failed to archive link", error);
                setActionError(actionMessage("generic"));
              } finally {
                setBusyRowId(null);
              }
            });
          },
        },
      ];

      if (canDelete) {
        items.push({
          id: "delete",
          label: tc("delete"),
          icon: <Icon name="trash" className="text-sm" />,
          danger: true,
          onSelect: () => {
            if (!window.confirm(t("deleteConfirm", { slug: row.slug }))) {
              return;
            }
            setBusyRowId(row.id);
            setActionError(null);
            startTransition(async () => {
              try {
                const result = await deleteLinkAction(row.id);
                if (!result.ok) {
                  setActionError(actionMessage(result.error));
                  return;
                }
                router.refresh();
              } catch (error) {
                console.error("failed to delete link", error);
                setActionError(actionMessage("generic"));
              } finally {
                setBusyRowId(null);
              }
            });
          },
        });
      }

      return items;
    },
    [actionMessage, canDelete, router, t, tc, tq, ts],
  );

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => (
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
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <input
              type="checkbox"
              aria-label={t("table.selectRow", { slug: row.slug })}
              checked={selected.has(row.id)}
              onChange={(event) => toggleRow(row.id, event.target.checked)}
            />
          );
        },
      }),
      columnHelper.accessor("slug", {
        header: t("shortLink"),
        cell: (info) => {
          const row = info.row.original;
          const url = `https://${row.hostname}/${row.slug}`;
          return (
            <div className="flex min-w-0 items-center gap-1">
              <Link
                href={`/links/${row.id}`}
                className="min-w-0 truncate font-mono text-ink no-underline hover:text-accent-ink"
              >
                <span className="text-fg-subtle">{row.hostname}/</span>
                <span className="font-medium">{row.slug}</span>
              </Link>
              <CopyButton value={url} label={t("copyShortLink")} iconOnly />
            </div>
          );
        },
      }),
      columnHelper.accessor("destination", {
        header: ts("destination"),
        cell: (info) => {
          const row = info.row.original;
          return (
            // Title and URL stacked: the title is what a human recognises, the
            // URL is what they verify against.
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-ink">{row.title ?? row.destination}</span>
              {row.title ? (
                <span className="truncate text-xs text-fg-subtle">{row.destination}</span>
              ) : null}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "flags",
        header: "",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-1.5">
              {row.hasRules ? (
                <Icon name="sliders" className="text-xs text-fg-subtle" aria-label={t("flagRules")} />
              ) : null}
              {row.hasPassword ? (
                <Icon name="key" className="text-xs text-fg-subtle" aria-label={t("flagPassword")} />
              ) : null}
              {row.expired ? (
                <Icon name="clock" className="text-xs text-warn" aria-label={t("flagExpired")} />
              ) : null}
            </div>
          );
        },
      }),
      columnHelper.accessor("tags", {
        header: t("colTags"),
        cell: (info) => {
          const tags = info.getValue();
          if (tags.length === 0) {
            return <span className="text-fg-faint">—</span>;
          }
          return (
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} tone="muted">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 ? (
                <span
                  className="numeric text-xs text-fg-subtle"
                  title={tags.slice(2).join(", ")}
                >
                  +{tags.length - 2}
                </span>
              ) : null}
            </div>
          );
        },
      }),
      columnHelper.accessor("clicks", {
        header: ts("clicks"),
        cell: (info) => {
          const value = info.getValue();
          return (
            <span className={value === 0 ? "text-fg-faint" : undefined}>
              {numberFormat.format(value)}
            </span>
          );
        },
      }),
      columnHelper.accessor("archived", {
        header: t("colStatus"),
        cell: (info) =>
          isScheduled(info.row.original, now) ? (
            <Badge tone="warn">{t("statusScheduled")}</Badge>
          ) : (
            <StatusBadge
              status={
                info.getValue() ? "archived" : info.row.original.expired ? "expired" : "active"
              }
            />
          ),
      }),
      columnHelper.accessor("createdAt", {
        header: t("colCreated"),
        cell: (info) => (
          <span className="numeric whitespace-nowrap text-fg-muted">
            {dateFormat.format(new Date(info.getValue()))}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <Dropdown
            label={t("rowActions", { slug: info.row.original.slug })}
            items={rowActions(info.row.original)}
            trigger={
              <Button
                variant="ghost"
                icon
                aria-label={t("rowActions", { slug: info.row.original.slug })}
                loading={busyRowId === info.row.original.id}
              >
                <Icon name="ellipsis" className="text-sm" />
              </Button>
            }
          />
        ),
      }),
    ],
    [
      allSelected,
      busyRowId,
      dateFormat,
      now,
      numberFormat,
      rowActions,
      selected,
      selectedIds.length,
      t,
      toggleAll,
      toggleRow,
      ts,
    ],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
  });

  // Past the last page counts as filtered too, so "Clear filters" gets the user back.
  const filtered = search !== "" || status !== "all" || folderFiltered || page > 1;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FilterBar
        options={statusOptions}
        value={status}
        pending={pending}
        onChange={(next) => navigate({ status: next === "all" ? null : next })}
        search={searchDraft}
        onSearchChange={setSearchDraft}
        onSearchSubmit={(value) => navigate({ search: value || null })}
        searchLabel={tc("searchLinks")}
        searchPlaceholder={t("searchPlaceholder")}
        actions={
          <Button size="sm" variant="primary" onClick={() => router.push("/links/new")}>
            <Icon name="plus" className="text-sm" />
            {tc("newLink")}
          </Button>
        }
      />

      {actionError ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      {notice && !actionError ? (
        <p role="status" className="m-0 flex items-center gap-2 text-sm text-fg-muted">
          <Icon name="circle-check" className="text-sm text-accent" aria-hidden="true" />
          {notice}
          <button
            type="button"
            className="text-fg-subtle hover:text-ink"
            aria-label={tc("dismiss")}
            onClick={() => setNotice(null)}
          >
            <Icon name="xmark" className="text-xs" aria-hidden="true" />
          </button>
        </p>
      ) : null}

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<Icon name="link" className="text-lg" />}
            title={t("emptyFilteredTitle")}
            description={t("emptyFilteredBody")}
            actions={
              <Button
                onClick={() => {
                  setSearchDraft("");
                  navigate({ search: null, status: null, folderId: null });
                }}
              >
                {t("clearFilters")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            tone="first-run"
            icon={<Icon name="link" className="text-lg" />}
            title={t("emptyTitle")}
            description={t("emptyBody")}
            actions={
              <Button variant="primary" onClick={() => router.push("/links/new")}>
                <Icon name="plus" className="text-sm" />
                {t("createFirst")}
              </Button>
            }
            hint={t("emptyHint")}
          />
        )
      ) : (
        <>
          {/*
            Sticky header: the column a figure belongs to has to stay on screen
            when a full page of 25 rows scrolls past it.
          */}
          <Table stickyHeader pending={pending} label={tn("links")}>
            <TableHead sticky>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHeaderCell
                      key={header.id}
                      numeric={NUMERIC_COLUMNS.has(header.column.id)}
                      className={cn(COLUMN_WIDTHS[header.column.id], COLUMN_RESPONSIVE[header.column.id])}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  selected={busyRowId === row.original.id || selected.has(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      numeric={NUMERIC_COLUMNS.has(cell.column.id)}
                      truncate={cell.column.id === "slug" || cell.column.id === "destination"}
                      className={COLUMN_RESPONSIVE[cell.column.id]}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {selectedIds.length > 0 ? (
            <LinksBulkBar
              selectedIds={selectedIds}
              canDelete={canDelete}
              onClear={() => setSelected(new Set())}
              onDone={(message) => {
                setActionError(null);
                setNotice(message);
                setSelected(new Set());
                router.refresh();
              }}
              onError={(message) => {
                setNotice(null);
                setActionError(message);
              }}
            />
          ) : null}

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            pending={pending}
            itemLabel={t("itemLabel")}
            onPageChange={(next) => navigate({ page: String(next) })}
          />
        </>
      )}
    </div>
  );
}
