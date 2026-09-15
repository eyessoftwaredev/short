"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Clock,
  ExternalLink,
  KeyRound,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
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

const STATUS_OPTIONS: FilterOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
  { id: "expired", label: "Expired" },
];

const columnHelper = createColumnHelper<LinkListRow>();

const numberFormat = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

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
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

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
          label: "Edit",
          icon: <Pencil className="size-4" />,
          href: `/links/${row.id}`,
        },
        {
          id: "stats",
          label: "Statistics",
          icon: <BarChart3 className="size-4" />,
          href: `/links/${row.id}/stats`,
        },
        {
          id: "open",
          label: "Open destination",
          icon: <ExternalLink className="size-4" />,
          href: row.destination,
        },
        {
          id: "archive",
          label: row.archived ? "Restore" : "Archive",
          icon: row.archived ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          ),
          separated: true,
          onSelect: () => {
            // Marking the row busy gives the click an immediate acknowledgement;
            // the table-wide pending state alone reads as the page freezing.
            setBusyRowId(row.id);
            startTransition(async () => {
              await archiveLinkAction(row.id, !row.archived);
              router.refresh();
              setBusyRowId(null);
            });
          },
        },
      ];

      if (canDelete) {
        items.push({
          id: "delete",
          label: "Delete",
          icon: <Trash2 className="size-4" />,
          danger: true,
          onSelect: () => {
            if (!window.confirm(`Delete /${row.slug}? This cannot be undone.`)) {
              return;
            }
            setBusyRowId(row.id);
            startTransition(async () => {
              await deleteLinkAction(row.id);
              router.refresh();
              setBusyRowId(null);
            });
          },
        });
      }

      return items;
    },
    [canDelete, router],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("slug", {
        header: "Short link",
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
              <CopyButton value={url} label="Copy short link" iconOnly />
            </div>
          );
        },
      }),
      columnHelper.accessor("destination", {
        header: "Destination",
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
                <SlidersHorizontal
                  className="size-3.5 text-fg-subtle"
                  aria-label="Has targeting rules"
                />
              ) : null}
              {row.hasPassword ? (
                <KeyRound className="size-3.5 text-fg-subtle" aria-label="Password protected" />
              ) : null}
              {row.expired ? <Clock className="size-3.5 text-warn" aria-label="Expired" /> : null}
            </div>
          );
        },
      }),
      columnHelper.accessor("tags", {
        header: "Tags",
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
        header: "Clicks",
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
        header: "Status",
        cell: (info) => (
          <StatusBadge
            status={
              info.getValue() ? "archived" : info.row.original.expired ? "expired" : "active"
            }
          />
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
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
            label={`Actions for ${info.row.original.slug}`}
            items={rowActions(info.row.original)}
            trigger={
              <Button
                variant="ghost"
                icon
                aria-label={`Actions for ${info.row.original.slug}`}
                loading={busyRowId === info.row.original.id}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
        ),
      }),
    ],
    [rowActions, busyRowId],
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
        options={STATUS_OPTIONS}
        value={status}
        pending={pending}
        onChange={(next) => navigate({ status: next === "all" ? null : next })}
        search={searchDraft}
        onSearchChange={setSearchDraft}
        onSearchSubmit={(value) => navigate({ search: value || null })}
        searchLabel="Search links"
        searchPlaceholder="Search slug, title or destination"
        actions={
          <Button size="sm" variant="primary" onClick={() => router.push("/links/new")}>
            <Plus className="size-4" />
            New link
          </Button>
        }
      />

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<Link2 className="size-5" />}
            title="No links match these filters"
            description="Nothing in this workspace matches the current search and status. Widen the filters to see more."
            actions={
              <Button
                onClick={() => {
                  setSearchDraft("");
                  navigate({ search: null, status: null });
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            tone="first-run"
            icon={<Link2 className="size-5" />}
            title="Turn a long URL into a link worth sharing"
            description="Short links track every click, and can send visitors to different destinations by country, device or language."
            actions={
              <Button variant="primary" onClick={() => router.push("/links/new")}>
                <Plus className="size-4" />
                Create your first link
              </Button>
            }
            hint="You can add a custom domain later without breaking links you have already shared."
          />
        )
      ) : (
        <>
          {/*
            Sticky header: the column a figure belongs to has to stay on screen
            when a full page of 25 rows scrolls past it.
          */}
          <Table stickyHeader pending={pending} label="Links">
            <TableHead sticky>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHeaderCell
                      key={header.id}
                      numeric={NUMERIC_COLUMNS.has(header.column.id)}
                      className={COLUMN_WIDTHS[header.column.id]}
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
            itemLabel="links"
            onPageChange={(next) => navigate({ page: String(next) })}
          />
        </>
      )}
    </div>
  );
}
