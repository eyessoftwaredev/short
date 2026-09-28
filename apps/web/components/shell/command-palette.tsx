"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { searchPaletteLinksAction, type PaletteLink } from "@/app/(panel)/search-actions";
import { Icon, type IconName } from "@/components/kit/icon";
import { usePanelSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cx";
import { getNavForRole } from "@/lib/nav";

type GroupId = "actions" | "pages" | "links" | "more";

type PaletteItem = {
  key: string;
  group: GroupId;
  label: string;
  detail?: string;
  icon: IconName;
  href: string;
  mono?: boolean;
  archived?: boolean;
};

type LinkSearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "done"; query: string; links: PaletteLink[] }
  | { status: "error"; query: string; message: "error" | "rateLimited" };

const SEARCH_DEBOUNCE_MS = 220;

/** True when the keystroke belongs to whatever the user is currently typing in. */
export function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/** "⌘K" on Apple platforms, "Ctrl K" elsewhere. Resolved after mount to keep hydration stable. */
export function useShortcutLabel(): string {
  const [label, setLabel] = useState("Ctrl K");
  useEffect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ?? navigator.platform;
    if (/mac|iphone|ipad|ipod/i.test(platform)) {
      setLabel("⌘K");
    }
  }, []);
  return label;
}

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Also open on a bare `/`. Off on screens whose own search field owns that key. */
  slashShortcut?: boolean;
};

export function CommandPalette({ open, onOpenChange, slashShortcut = true }: CommandPaletteProps) {
  // Ctrl/Cmd+K works everywhere, including while typing: it is not a character.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }
      const isK = event.key === "k" || event.key === "K";
      if (isK && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (
        slashShortcut &&
        !open &&
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditingTarget(event.target)
      ) {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange, slashShortcut]);

  if (!open) {
    return null;
  }
  return <PaletteDialog onClose={() => onOpenChange(false)} />;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("palette");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const session = usePanelSession();
  const shortcut = useShortcutLabel();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState<LinkSearchState>({ status: "idle" });

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef(new Map<string, PaletteLink[]>());
  const requestRef = useRef(0);
  const navigatedRef = useRef(false);

  const titleId = useId();
  const listId = useId();
  const optionId = (index: number): string => `${listId}-opt-${index}`;

  const trimmed = query.trim();
  const normalized = trimmed.toLocaleLowerCase(locale);

  // Focus in, scroll lock, focus back out to whatever opened the palette.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (!navigatedRef.current) {
        previous?.focus();
      }
    };
  }, []);

  // Debounced, workspace-scoped link lookup. Repeat queries (e.g. backspacing) come
  // from the per-open cache instead of another round trip.
  useEffect(() => {
    if (trimmed === "") {
      requestRef.current += 1;
      setSearch({ status: "idle" });
      return undefined;
    }
    const cached = cacheRef.current.get(trimmed);
    if (cached) {
      requestRef.current += 1;
      setSearch({ status: "done", query: trimmed, links: cached });
      return undefined;
    }
    // Bumped now, not when the timer fires, so a reply still in flight for an older
    // query can never overwrite the state of this one.
    const requestId = ++requestRef.current;
    setSearch({ status: "loading", query: trimmed });
    const handle = window.setTimeout(() => {
      searchPaletteLinksAction(trimmed)
        .then((result) => {
          if (result.ok) {
            cacheRef.current.set(trimmed, result.data);
          }
          if (requestId !== requestRef.current) {
            return;
          }
          if (result.ok) {
            setSearch({ status: "done", query: trimmed, links: result.data });
          } else {
            setSearch({
              status: "error",
              query: trimmed,
              message: result.error === "rate_limited" ? "rateLimited" : "error",
            });
          }
        })
        .catch(() => {
          if (requestId === requestRef.current) {
            setSearch({ status: "error", query: trimmed, message: "error" });
          }
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [trimmed]);

  const staticItems = useMemo<PaletteItem[]>(() => {
    const actions: PaletteItem[] = [
      { key: "create-link", group: "actions", label: t("createLink"), icon: "plus", href: "/links/new" },
      { key: "create-qr", group: "actions", label: t("createQr"), icon: "qrcode", href: "/qr/new" },
      {
        key: "create-bio",
        group: "actions",
        label: t("createBio"),
        icon: "address-card",
        href: "/bio/new",
      },
    ];
    const pages: PaletteItem[] = getNavForRole(session.role).flatMap((group) =>
      group.items.map((item) => ({
        key: `nav-${item.id}`,
        group: "pages" as const,
        label: tNav(item.id as "dashboard"),
        detail: group.label === "Platform" ? tNav("platform") : undefined,
        icon: item.icon,
        href: item.href,
      })),
    );
    return [...actions, ...pages];
  }, [session.role, t, tNav]);

  const items = useMemo<PaletteItem[]>(() => {
    const matched =
      normalized === ""
        ? staticItems
        : staticItems.filter((item) => item.label.toLocaleLowerCase(locale).includes(normalized));
    if (trimmed === "") {
      return matched;
    }
    const links: PaletteItem[] =
      search.status === "done" && search.query === trimmed
        ? search.links.map((link) => ({
            key: `link-${link.id}`,
            group: "links" as const,
            label: `${link.hostname}/${link.slug}`,
            detail: link.title?.trim() || link.destination,
            icon: "link" as const,
            href: `/links/${link.id}`,
            mono: true,
            archived: link.archived,
          }))
        : [];
    const searchAll: PaletteItem = {
      key: "search-all",
      group: "more",
      label: t("searchAll", { query: trimmed }),
      icon: "search",
      href: `/links?search=${encodeURIComponent(trimmed)}`,
    };
    return [...matched, ...links, searchAll];
  }, [staticItems, normalized, trimmed, search, locale, t]);

  // A new result set starts at the top; a stale index would point past the end.
  useEffect(() => {
    setActive(0);
  }, [trimmed]);
  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items.length]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const activate = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) {
        return;
      }
      navigatedRef.current = true;
      onClose();
      router.push(item.href);
    },
    [onClose, router],
  );

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) {
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + items.length) % items.length);
    } else if (event.key === "Home" && trimmed === "") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && trimmed === "") {
      event.preventDefault();
      setActive(Math.max(items.length - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      activate(items[active]);
    }
  };

  // Esc closes; Tab cycles inside the dialog so focus never lands behind the overlay.
  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const groupLabels: Record<GroupId, string> = {
    actions: t("actions"),
    pages: t("pages"),
    links: t("links"),
    more: t("more"),
  };
  const groups = (["actions", "pages", "links", "more"] as const)
    .map((group) => ({
      group,
      entries: items
        .map((item, index) => ({ item, index }))
        .filter((entry) => entry.item.group === group),
    }))
    .filter((entry) => entry.entries.length > 0);

  const searchingLinks = trimmed !== "" && search.status === "loading";
  const status =
    trimmed === ""
      ? null
      : searchingLinks
        ? t("searching")
        : search.status === "error"
          ? t(search.message)
          : search.status === "done" && search.links.length === 0
            ? t("noLinks", { query: trimmed })
            : null;

  return (
    <div
      role="presentation"
      className="animate-fade-in fixed inset-0 z-modal flex items-start justify-center bg-overlay p-3 pt-[8vh] backdrop-blur-[2px] sm:p-6 sm:pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-pop-in flex max-h-[min(34rem,84vh)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-elevated shadow-modal"
        onKeyDown={onDialogKeyDown}
      >
        <h2 id={titleId} className="sr-only">
          {t("title")}
        </h2>
        <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
          <div className="relative min-w-0 flex-1">
            <Icon
              name={searchingLinks ? "spinner" : "search"}
              className="pointer-events-none absolute top-1/2 left-1 -translate-y-1/2 text-sm text-fg-subtle"
            />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label={t("inputLabel")}
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={items.length > 0 ? optionId(active) : undefined}
              aria-describedby={`${listId}-hint`}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              value={query}
              placeholder={t("placeholder")}
              className="h-11 w-full border-0 bg-transparent py-2 pr-3 pl-8 text-base shadow-none focus:shadow-none sm:text-[15px]"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
            />
          </div>
          <Kbd className="hidden sm:inline-flex" aria-hidden="true">
            Esc
          </Kbd>
          <Button variant="ghost" icon className="sm:hidden" aria-label={t("close")} onClick={onClose}>
            <Icon name="xmark" className="text-sm" />
          </Button>
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t("title")}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
        >
          {groups.map(({ group, entries }) => (
            <div key={group} role="group" aria-labelledby={`${listId}-${group}`} className="mb-1 last:mb-0">
              <div
                id={`${listId}-${group}`}
                role="presentation"
                className="px-2.5 pt-2.5 pb-1 text-xs font-medium text-fg-subtle"
              >
                {groupLabels[group]}
              </div>
              {entries.map(({ item, index }) => {
                const selected = index === active;
                return (
                  <div
                    key={item.key}
                    id={optionId(index)}
                    role="option"
                    aria-selected={selected}
                    data-index={index}
                    className={cn(
                      "flex min-h-10 min-w-0 cursor-pointer items-center gap-3 rounded-default px-2.5 py-2 text-sm",
                      selected ? "bg-surface text-ink" : "text-ink",
                    )}
                    onMouseMove={() => {
                      if (!selected) {
                        setActive(index);
                      }
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => activate(item)}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-sm border",
                        selected
                          ? "border-accent-border bg-accent-surface text-accent-on-surface"
                          : "border-border bg-bg text-fg-subtle",
                      )}
                    >
                      <Icon name={item.icon} className="text-xs" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("truncate", item.mono && "font-mono text-[13px]")}>
                        {item.label}
                      </span>
                      {item.detail && item.group === "links" ? (
                        <span className="truncate text-xs text-fg-muted">{item.detail}</span>
                      ) : null}
                    </span>
                    {item.archived ? (
                      <Badge tone="muted" className="shrink-0">
                        {t("archived")}
                      </Badge>
                    ) : null}
                    {item.detail && item.group !== "links" ? (
                      <span className="shrink-0 text-xs text-fg-subtle">{item.detail}</span>
                    ) : null}
                    {selected ? (
                      <Icon name="arrow-right" className="shrink-0 text-xs text-fg-subtle" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div
          id={`${listId}-hint`}
          className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-fg-subtle"
        >
          <span role="status" aria-live="polite" className="min-w-0 truncate">
            {status ?? t("scope")}
          </span>
          <span className="hidden shrink-0 items-center gap-3 sm:flex" aria-hidden="true">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              {t("hintMove")}
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              {t("hintOpen")}
            </span>
            <span className="flex items-center gap-1">
              <Kbd>{shortcut}</Kbd>
              {t("hintToggle")}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
