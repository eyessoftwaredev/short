"use client";

import { Icon } from "@/components/kit/icon";
import { Button, EmptyState, Input, Modal, Skeleton, Tabs } from "@/components/ui";
import type { MediaListItem } from "@/lib/media";
import { cn } from "@/lib/cx";
import {
  parseQrLogoPreset,
  QR_LOGO_PRESETS,
  qrLogoPresetUrl,
  searchQrLogoPresets,
  type QrLogoPreset,
} from "@/lib/qr-logo-presets";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import {
  ACCEPTED_IMAGE_TYPES,
  CHECKERBOARD,
  droppedFile,
  uploadMediaFile,
  type MediaErrorKey,
} from "./upload";

type MediaPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  selectedUrl?: string;
  /** Adds the built-in QR logo libraries (brand icons, emoji) next to the uploads. */
  presets?: boolean;
  /** Tile colour behind uploads, e.g. the QR background. Defaults to a checkerboard. */
  previewBackground?: string;
};

type MediaListResponse = {
  data: MediaListItem[];
  pagination: { page: number; pageSize: number; total: number };
};

type PickerTab = "media" | "social" | "emoji";

const PAGE_SIZE = 48;

const SOCIAL_PRESETS = QR_LOGO_PRESETS.filter((preset) => preset.category !== "emoji");
const EMOJI_PRESETS = QR_LOGO_PRESETS.filter((preset) => preset.category === "emoji");

function initialTab(presets: boolean, selectedUrl: string | undefined): PickerTab {
  const preset = presets ? parseQrLogoPreset(selectedUrl) : null;
  if (!preset) {
    return "media";
  }
  return preset.category === "emoji" ? "emoji" : "social";
}

/** Tick in the corner of the tile that is currently in use. */
function SelectedMark() {
  return (
    <span
      className="pointer-events-none absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent shadow-xs"
      aria-hidden="true"
    >
      <Icon name="check" className="text-[10px]" />
    </span>
  );
}

const tileBase =
  "relative flex w-full items-center justify-center overflow-hidden rounded-md border transition-[border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function tileState(active: boolean): string {
  return active
    ? "border-accent shadow-[0_0_0_3px_var(--ring)]"
    : "border-border hover:-translate-y-px hover:border-border-hover hover:shadow-xs";
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  selectedUrl,
  presets = false,
  previewBackground,
}: MediaPickerProps) {
  const t = useTranslations("media");
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PickerTab>(() => initialTab(presets, selectedUrl));
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Every opening starts on the library the current image came from, with a fresh search.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab(initialTab(presets, selectedUrl));
      setQuery("");
      setError(null);
      setConfirmingId(null);
    }
  }

  const loadPage = useCallback(
    async (next: number): Promise<void> => {
      const first = next === 1;
      if (first) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const response = await fetch(`/api/media?pageSize=${PAGE_SIZE}&page=${next}`);
        if (!response.ok) {
          setError(t("libraryLoadFailed"));
          return;
        }
        const payload = (await response.json()) as MediaListResponse;
        setItems((prev) => {
          if (first) {
            return payload.data;
          }
          const seen = new Set(prev.map((item) => item.id));
          return [...prev, ...payload.data.filter((item) => !seen.has(item.id))];
        });
        setTotal(payload.pagination.total);
        setPage(next);
      } catch {
        setError(t("libraryLoadFailed"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (open) {
      void loadPage(1);
    }
  }, [open, loadPage]);

  const labelOf = useCallback(
    (preset: QrLogoPreset) => (locale === "tr" ? preset.tr : preset.en),
    [locale],
  );
  const social = useMemo(() => searchQrLogoPresets(SOCIAL_PRESETS, query), [query]);
  const emoji = useMemo(() => searchQrLogoPresets(EMOJI_PRESETS, query), [query]);
  const media = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return needle === ""
      ? items
      : items.filter((item) => (item.filename ?? "").toLocaleLowerCase(locale).includes(needle));
  }, [items, locale, query]);

  function choose(url: string): void {
    onSelect(url);
    onClose();
  }

  async function onUpload(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }
    setUploading(true);
    setError(null);
    const result = await uploadMediaFile(file);
    setUploading(false);
    if (!result.ok) {
      setError(t(result.error satisfies MediaErrorKey));
      setTab("media");
      return;
    }
    setItems((prev) => [
      {
        id: result.id,
        url: result.url,
        contentType: result.contentType,
        filename: file.name,
        byteSize: file.size,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setTotal((prev) => prev + 1);
    choose(result.url);
  }

  async function onDelete(id: string): Promise<void> {
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (response.status === 409) {
        setError(t("mediaInUse"));
        return;
      }
      if (!response.ok && response.status !== 404) {
        setError(t("mediaDeleteFailed"));
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch {
      setError(t("mediaDeleteFailed"));
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  if (!open) {
    return null;
  }

  const trimmed = query.trim();
  const noMatches = (
    <EmptyState
      bare
      size="sm"
      icon="search"
      title={t("noMatches", { query: trimmed })}
      description={t("noMatchesHint")}
      actions={
        <Button size="sm" onClick={() => setQuery("")}>
          {t("clearSearch")}
        </Button>
      }
    />
  );

  function presetGrid(list: QrLogoPreset[], withLabels: boolean) {
    return (
      <ul
        className={cn(
          "m-0 grid list-none gap-2 p-0",
          withLabels ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-5 sm:grid-cols-8",
        )}
      >
        {list.map((preset) => {
          const url = qrLogoPresetUrl(preset.id);
          const active = selectedUrl === url;
          const label = labelOf(preset);
          return (
            <li key={preset.id} className="min-w-0">
              <button
                type="button"
                aria-pressed={active}
                aria-label={label}
                title={label}
                className="group flex w-full min-w-0 flex-col items-center gap-1 rounded-md text-center focus-visible:outline-none"
                onClick={() => choose(url)}
              >
                <span
                  className={cn(
                    tileBase,
                    tileState(active),
                    "aspect-square bg-surface p-2 group-focus-visible:ring-2 group-focus-visible:ring-accent",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" loading="lazy" className="size-full object-contain" />
                  {active ? <SelectedMark /> : null}
                </span>
                {withLabels ? (
                  <span
                    className={cn(
                      "w-full truncate text-[11px] leading-4",
                      active ? "font-medium text-ink" : "text-fg-muted",
                    )}
                  >
                    {label}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const uploadTile = (
    <button
      type="button"
      disabled={uploading}
      onClick={() => inputRef.current?.click()}
      className={cn(
        tileBase,
        "aspect-square flex-col gap-1.5 border-dashed border-border-strong bg-bg text-fg-muted hover:border-accent hover:text-accent-ink disabled:opacity-60",
      )}
    >
      <Icon name={uploading ? "spinner" : "cloud-up"} className="text-base" />
      <span className="px-2 text-xs font-medium">{uploading ? t("uploading") : t("uploadNew")}</span>
    </button>
  );

  const mediaPanel = loading ? (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true" aria-label={t("libraryLoading")}>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="aspect-square w-full rounded-md" />
      ))}
    </div>
  ) : items.length === 0 ? (
    <EmptyState
      bare
      size="sm"
      tone="first-run"
      icon="image"
      title={t("libraryEmptyTitle")}
      description={presets ? t("libraryEmptyWithPresets") : t("libraryEmpty")}
      actions={
        <Button
          size="sm"
          variant="primary"
          leadingIcon="cloud-up"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {t("upload")}
        </Button>
      }
      hint={t("dropHint")}
    />
  ) : media.length === 0 ? (
    noMatches
  ) : (
    <div className="flex min-w-0 flex-col gap-3">
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
        {trimmed === "" ? <li className="min-w-0">{uploadTile}</li> : null}
        {media.map((item) => {
          const active = selectedUrl === item.url;
          const confirming = confirmingId === item.id;
          const name = item.filename ?? item.id.slice(0, 8);
          return (
            <li key={item.id} className="group relative min-w-0">
              <button
                type="button"
                aria-pressed={active}
                aria-label={t("useImage", { name })}
                title={name}
                className={cn(
                  tileBase,
                  tileState(active),
                  "aspect-square",
                  previewBackground ? null : CHECKERBOARD,
                )}
                style={previewBackground ? { background: previewBackground } : undefined}
                onClick={() => choose(item.url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" loading="lazy" className="size-full object-contain p-2" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-elevated/90 px-1.5 py-0.5 text-left text-[11px] text-fg-muted">
                  {name}
                </span>
                {active ? <SelectedMark /> : null}
              </button>
              {confirming ? (
                <div
                  role="group"
                  aria-label={t("deleteImage")}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md border border-danger-border bg-elevated/95 p-2 text-center"
                >
                  <span className="text-xs font-medium text-ink">{t("deleteImageConfirm")}</span>
                  <span className="flex flex-wrap justify-center gap-1.5">
                    <Button
                      size="sm"
                      variant="danger"
                      loading={deletingId === item.id}
                      onClick={() => void onDelete(item.id)}
                    >
                      {t("deleteImageShort")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                      {t("keepImage")}
                    </Button>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={t("deleteNamed", { name })}
                  className="absolute top-1 left-1 flex size-7 items-center justify-center rounded-default border border-border bg-elevated/95 text-fg-muted shadow-xs transition-colors hover:border-danger-border hover:text-danger focus-visible:flex sm:hidden sm:group-focus-within:flex sm:group-hover:flex"
                  onClick={() => setConfirmingId(item.id)}
                >
                  <Icon name="trash" className="text-xs" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {items.length < total && trimmed === "" ? (
        <Button
          size="sm"
          variant="ghost"
          className="self-center"
          loading={loadingMore}
          onClick={() => void loadPage(page + 1)}
        >
          {t("loadMore", { count: total - items.length })}
        </Button>
      ) : null}
    </div>
  );

  const dropProps = {
    onDragOver: (event: DragEvent) => {
      if (event.dataTransfer.types.includes("Files")) {
        event.preventDefault();
        setDragging(true);
      }
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setDragging(false);
      }
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      void onUpload(droppedFile(event));
    },
  };

  const searchPlaceholder = tab === "media" ? t("searchMedia") : t("searchLogos");

  // Portalled: pickers are often rendered inside a form field's <label>, where a click on
  // any plain part of the dialog would otherwise activate the label's file input.
  return createPortal(
    <Modal
      open={open}
      size="lg"
      title={presets ? t("logoLibraryTitle") : t("libraryTitle")}
      description={presets ? t("logoLibraryDesc") : t("libraryDesc")}
      onClose={onClose}
      footer={
        <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            disabled={uploading}
            onChange={(event) => {
              void onUpload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            leadingIcon="cloud-up"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? t("uploading") : t("uploadNew")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            {t("closeLibrary")}
          </Button>
        </div>
      }
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-4 rounded-md transition-colors duration-150",
          dragging && "bg-accent-tint ring-2 ring-accent-border ring-offset-4 ring-offset-elevated",
        )}
        {...dropProps}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          {presets ? (
            <Tabs<PickerTab>
              variant="segmented"
              label={t("libraryTabs")}
              value={tab}
              onChange={(next) => {
                setTab(next);
                setConfirmingId(null);
              }}
              items={[
                { id: "media", label: t("tabMedia"), count: total > 0 ? total : undefined },
                { id: "social", label: t("tabSocial") },
                { id: "emoji", label: t("tabEmoji") },
              ]}
            />
          ) : null}

          {presets || items.length > 8 ? (
            <Input
              type="search"
              value={query}
              autoComplete="off"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              prefix={<Icon name="search" className="text-xs" />}
              wrapperClassName="min-w-0 flex-1"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                // The picker can sit inside a form; Enter must not submit it.
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
            />
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="m-0 flex items-start gap-1.5 text-[13px] leading-5 text-danger">
            <Icon name="circle-xmark" className="mt-0.5 text-xs" />
            <span className="min-w-0">{error}</span>
          </p>
        ) : null}

        {tab === "social" ? (
          <div role="tabpanel" className="flex min-w-0 flex-col gap-4">
            {social.length === 0 ? noMatches : null}
            {(["social", "contact"] as const).map((category) => {
              const list = social.filter((preset) => preset.category === category);
              return list.length > 0 ? (
                <section key={category} className="flex min-w-0 flex-col gap-2">
                  <h3 className="m-0 text-[13px] font-medium text-fg-subtle">
                    {category === "social" ? t("presetBrands") : t("presetContact")}
                  </h3>
                  {presetGrid(list, true)}
                </section>
              ) : null;
            })}
            <p className="m-0 text-xs leading-relaxed text-fg-subtle">{t("brandNotice")}</p>
          </div>
        ) : tab === "emoji" ? (
          <div role="tabpanel" className="flex min-w-0 flex-col gap-3">
            {emoji.length === 0 ? noMatches : presetGrid(emoji, false)}
            <p className="m-0 text-xs leading-relaxed text-fg-subtle">
              {t.rich("twemojiCredit", {
                link: (chunks) => (
                  <a
                    href="https://github.com/jdecked/twemoji"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fg-subtle underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
        ) : presets ? (
          <div role="tabpanel" className="min-w-0">
            {mediaPanel}
          </div>
        ) : (
          mediaPanel
        )}
      </div>
    </Modal>,
    document.body,
  );
}
