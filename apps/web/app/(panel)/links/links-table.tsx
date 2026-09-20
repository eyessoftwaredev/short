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
import { cn } from "@/lib/cx";
import { archiveLinkAction, deleteLinkAction } from "./actions";

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
};

type StatusFilter = "all" | "active" | "archived" | "expired";

const columnHelper = createColumnHelper<LinkListRow>();

/**
 * Explicit widths on the fixed-size columns leave the remainder to the two
 * text columns, which then truncate instead of pushing the actions off-screen.
 */
const COLUMN_WIDTHS: Record<string, string> = {
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
  canDelete: boolean;
};

export function LinksTable({
  rows,
  total,
  page,
  pageSize,
  search,
  status,
  canDelete,
}: LinksTableProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const ts = useTranslations("stats");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

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
          id: "open",
          label: t("openDestination"),
          icon: <Icon name="external-link" className="text-sm" />,
          href: row.destination,
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
            startTransition(async () => {
              try {
                await archiveLinkAction(row.id, !row.archived);
                router.refresh();
              } catch (error) {
                console.error("failed to archive link", error);
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
            startTransition(async () => {
              try {
                await deleteLinkAction(row.id);
                router.refresh();
              } catch (error) {
                console.error("failed to delete link", error);
              } finally {
                setBusyRowId(null);
              }
            });
          },
        });
      }

      return items;
    },
    [canDelete, router, t, tc, ts],
  );

  const columns = useMemo(
    () => [
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
        cell: (info) => (
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
    [busyRowId, dateFormat, numberFormat, rowActions, t, ts],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
  });

  const filtered = search !== "" || status !== "all";

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
                  navigate({ search: null, status: null });
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
                <TableRow key={row.id} selected={busyRowId === row.original.id}>
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
