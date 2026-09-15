"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { FilterBar, type FilterOption } from "@/components/ui";

type QueryFilterBarProps = {
  /** Search param the chips write to, e.g. `status`. */
  paramKey?: string;
  options?: readonly FilterOption[];
  value?: string;
  searchKey?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  /** Set to false for lists that only filter by chips. */
  searchable?: boolean;
  actions?: ReactNode;
};

/**
 * Server-rendered lists keep their filter state in the URL. Search is debounced so a
 * keystroke does not trigger a round trip per character.
 */
export function QueryFilterBar({
  paramKey = "status",
  options = [],
  value,
  searchKey = "q",
  searchValue = "",
  searchPlaceholder,
  searchable = true,
  actions,
}: QueryFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchValue);

  function push(mutate: (params: URLSearchParams) => void): void {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const query = params.toString();
    startTransition(() => router.push(query === "" ? pathname : `${pathname}?${query}`));
  }

  useEffect(() => {
    if (search === searchValue) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim() === "") {
        params.delete(searchKey);
      } else {
        params.set(searchKey, search.trim());
      }
      params.delete("page");
      const query = params.toString();
      startTransition(() => router.push(query === "" ? pathname : `${pathname}?${query}`));
    }, 350);

    return () => clearTimeout(timer);
  }, [search, searchValue, searchKey, searchParams, pathname, router, startTransition]);

  return (
    <FilterBar
      options={options}
      value={value}
      onChange={(id) =>
        push((params) => {
          if (id === "all") {
            params.delete(paramKey);
          } else {
            params.set(paramKey, id);
          }
        })
      }
      search={search}
      onSearchChange={searchable ? setSearch : undefined}
      searchPlaceholder={searchPlaceholder}
      actions={actions}
    />
  );
}
