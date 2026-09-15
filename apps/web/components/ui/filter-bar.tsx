"use client";

import { useId, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cx";

export type FilterOption<T extends string = string> = {
  id: T;
  label: ReactNode;
  count?: number;
};

type FilterBarProps<T extends string> = {
  options?: readonly FilterOption<T>[];
  value?: T;
  onChange?: (id: T) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  /**
   * Runs on Enter and on the clear button. Typing a query and pressing Enter is
   * the reflex in every list UI; without this the field is a dead end until the
   * user finds the Apply button.
   */
  onSearchSubmit?: (value: string) => void;
  searchPlaceholder?: string;
  /** Accessible name for the search field. Falls back to the placeholder. */
  searchLabel?: string;
  /** Extra controls rendered on the trailing edge, e.g. a sort select. */
  actions?: ReactNode;
  /** Dims the filter chips while the new result set is loading. */
  pending?: boolean;
  className?: string;
};

export function FilterBar<T extends string>({
  options = [],
  value,
  onChange,
  search,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "Search",
  searchLabel,
  actions,
  pending = false,
  className,
}: FilterBarProps<T>) {
  const searchId = useId();
  const showClear = onSearchSubmit != null && search != null && search !== "";

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-3", className)}>
      {onSearchChange ? (
        <div className="relative min-w-52 flex-1">
          <label htmlFor={searchId} className="sr-only">
            {searchLabel ?? searchPlaceholder}
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && onSearchSubmit) {
                event.preventDefault();
                onSearchSubmit(event.currentTarget.value);
              }
            }}
            placeholder={searchPlaceholder}
            className={cn("h-9 w-full py-2 pl-9", showClear ? "pr-9" : "pr-3")}
          />
          {showClear ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onSearchChange("");
                onSearchSubmit?.("");
              }}
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-fg-subtle transition duration-150 hover:bg-surface hover:text-ink"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}

      {options.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {options.map((option) => (
            <Chip
              key={option.id}
              active={option.id === value}
              pending={pending}
              onClick={() => onChange?.(option.id)}
            >
              {option.label}
              {option.count != null ? (
                <span
                  className={cn(
                    "numeric font-mono text-xs",
                    option.id === value ? "text-accent-on-surface" : "text-fg-subtle",
                  )}
                >
                  {option.count}
                </span>
              ) : null}
            </Chip>
          ))}
        </div>
      ) : null}

      {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
