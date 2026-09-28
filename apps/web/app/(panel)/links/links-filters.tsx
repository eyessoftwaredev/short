"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button, FilterBar, Select, type FilterOption } from "@/components/ui";
import { cn } from "@/lib/cx";
import { FolderManagerButton, type FolderChip } from "./folders-bar";

export type StatusFilter = "all" | "active" | "scheduled" | "expired" | "limit" | "broken" | "archived";
export type SortOption = "created_desc" | "created_asc" | "slug_asc";

export type LinksFilterState = {
  search: string;
  status: StatusFilter;
  folderId: string;
  tag: string;
  domainId: string;
  sort: SortOption;
};

type LinksFiltersProps = {
  value: LinksFilterState;
  folders: FolderChip[];
  tags: string[];
  domains: { id: string; hostname: string }[];
};

/** Compact selects that sit on the same line height as the status chips. */
const FILTER_SELECT = "h-8 min-h-8 w-full py-0 pl-3 text-[13px] sm:w-auto sm:max-w-56";

/**
 * Search, status chips and the folder / tag / domain / sort selects. Every filter lives
 * in the URL so a filtered list can be bookmarked, shared and survives a refresh.
 */
export function LinksFilters({ value, folders, tags, domains }: LinksFiltersProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(value.search);

  // Back/forward or a "Clear filters" elsewhere changes the URL under the input.
  useEffect(() => {
    setSearch(value.search);
  }, [value.search]);

  const navigate = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, entry] of Object.entries(patch)) {
        if (entry == null || entry === "") {
          next.delete(key);
        } else {
          next.set(key, entry);
        }
      }
      next.delete("page");
      const query = next.toString();
      startTransition(() => router.push(query ? `/links?${query}` : "/links"));
    },
    [params, router],
  );

  const setStatus = (status: StatusFilter): void => {
    if (status === "broken") {
      navigate({ status: null, clickLimit: null, health: "broken" });
    } else if (status === "limit") {
      navigate({ status: null, health: null, clickLimit: "reached" });
    } else {
      navigate({ status: status === "all" ? null : status, health: null, clickLimit: null });
    }
  };

  const statusOptions: FilterOption<StatusFilter>[] = [
    { id: "all", label: t("statusAll") },
    { id: "active", label: t("state.active") },
    { id: "scheduled", label: t("state.scheduled") },
    { id: "expired", label: t("state.expired") },
    { id: "limit", label: t("state.limit") },
    { id: "broken", label: t("state.broken") },
    { id: "archived", label: t("state.archived") },
  ];

  const anyFilter =
    value.search !== "" ||
    value.status !== "all" ||
    value.folderId !== "" ||
    value.tag !== "" ||
    value.domainId !== "";

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", pending && "opacity-80")}>
      <FilterBar
        options={statusOptions}
        value={value.status}
        pending={pending}
        onChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={(next) => navigate({ search: next.trim() || null })}
        searchLabel={tc("searchLinks")}
        searchPlaceholder={t("searchPlaceholder")}
      />

      <div className="grid min-w-0 grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <span className="col-span-2 flex min-w-0 items-center gap-1 sm:col-span-1">
          <Select
            aria-label={t("list.filterFolder")}
            className={FILTER_SELECT}
            value={value.folderId}
            onChange={(event) => navigate({ folderId: event.target.value || null })}
          >
            <option value="">{t("allFolders")}</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </Select>
          <FolderManagerButton folders={folders} selectedId={value.folderId} />
        </span>

        {tags.length > 0 ? (
          <Select
            aria-label={t("list.filterTag")}
            className={FILTER_SELECT}
            value={value.tag}
            onChange={(event) => navigate({ tag: event.target.value || null })}
          >
            <option value="">{t("list.allTags")}</option>
            {/* A tag from a stale URL still shows as selected. */}
            {value.tag !== "" && !tags.includes(value.tag) ? <option value={value.tag}>{value.tag}</option> : null}
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Select>
        ) : null}

        {domains.length > 1 ? (
          <Select
            aria-label={t("list.filterDomain")}
            className={FILTER_SELECT}
            value={value.domainId}
            onChange={(event) => navigate({ domainId: event.target.value || null })}
          >
            <option value="">{t("list.allDomains")}</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.hostname}
              </option>
            ))}
          </Select>
        ) : null}

        <Select
          aria-label={t("list.sortLabel")}
          className={FILTER_SELECT}
          value={value.sort}
          onChange={(event) =>
            navigate({ sort: event.target.value === "created_desc" ? null : event.target.value })
          }
        >
          <option value="created_desc">{t("list.sortNewest")}</option>
          <option value="created_asc">{t("list.sortOldest")}</option>
          <option value="slug_asc">{t("list.sortSlug")}</option>
        </Select>

        {anyFilter ? (
          <Button
            size="sm"
            variant="ghost"
            leadingIcon="xmark"
            className="col-span-2 justify-self-start sm:col-span-1"
            onClick={() => {
              setSearch("");
              navigate({
                search: null,
                status: null,
                health: null,
                clickLimit: null,
                folderId: null,
                tag: null,
                domainId: null,
              });
            }}
          >
            {t("clearFilters")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
