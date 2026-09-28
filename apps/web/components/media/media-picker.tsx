"use client";

import { Icon } from "@/components/kit/icon";
import { Button, Modal, Tabs } from "@/components/ui";
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
import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

type MediaPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  selectedUrl?: string;
  /** Adds the built-in QR logo libraries (brand icons, emoji) next to the uploads. */
  presets?: boolean;
};

type MediaListResponse = {
  data: MediaListItem[];
  pagination: { page: number; pageSize: number; total: number };
};

type UploadResponse = {
  data: { id: string; url: string; contentType: string };
};

type ErrorResponse = {
  error?: { code?: string };
};

type PickerTab = "media" | "social" | "emoji";

const SOCIAL_PRESETS = QR_LOGO_PRESETS.filter((preset) => preset.category !== "emoji");
const EMOJI_PRESETS = QR_LOGO_PRESETS.filter((preset) => preset.category === "emoji");

function initialTab(presets: boolean, selectedUrl: string | undefined): PickerTab {
  const preset = presets ? parseQrLogoPreset(selectedUrl) : null;
  if (!preset) {
    return "media";
  }
  return preset.category === "emoji" ? "emoji" : "social";
}

function mediaErrorKey(code: string | undefined): "media_type" | "media_size" | "media_failed" {
  if (code === "media_type" || code === "media_size") {
    return code;
  }
  return "media_failed";
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  selectedUrl,
  presets = false,
}: MediaPickerProps) {
  const t = useTranslations("media");
  const locale = useLocale();
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PickerTab>(() => initialTab(presets, selectedUrl));
  const [query, setQuery] = useState("");
  const [wasOpen, setWasOpen] = useState(open);

  // Every opening starts on the library the current image came from, with a fresh search.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab(initialTab(presets, selectedUrl));
      setQuery("");
    }
  }

  const loadItems = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/media?pageSize=48");
      if (!response.ok) {
        setError(t("libraryLoadFailed"));
        return;
      }
      const payload = (await response.json()) as MediaListResponse;
      setItems(payload.data);
    } catch {
      setError(t("libraryLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      void loadItems();
    }
  }, [open, loadItems]);

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
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const payload = (await response.json()) as UploadResponse & ErrorResponse;
      if (!response.ok) {
        setError(t(mediaErrorKey(payload.error?.code)));
        return;
      }
      setItems((prev) => [
        {
          id: payload.data.id,
          url: payload.data.url,
          contentType: payload.data.contentType,
          filename: file.name,
          byteSize: file.size,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      choose(payload.data.url);
    } catch {
      setError(t("media_failed"));
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (response.status === 409) {
        setError(t("mediaInUse"));
        return;
      }
      if (!response.ok) {
        setError(t("mediaDeleteFailed"));
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError(t("mediaDeleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) {
    return null;
  }

  const noMatches = (
    <p className="m-0 text-sm text-fg-muted">{t("noMatches", { query: query.trim() })}</p>
  );

  function presetGrid(list: QrLogoPreset[]) {
    return (
      <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-6">
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
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-default border bg-surface-subtle p-1.5 transition duration-150 hover:-translate-y-px",
                  active
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-border hover:border-accent/40",
                )}
                onClick={() => choose(url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" className="size-full object-contain" />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const mediaPanel = loading ? (
    <p className="m-0 text-sm text-fg-muted">{t("libraryLoading")}</p>
  ) : items.length === 0 ? (
    <p className="m-0 text-sm text-fg-muted">
      {presets ? t("libraryEmptyWithPresets") : t("libraryEmpty")}
    </p>
  ) : media.length === 0 ? (
    noMatches
  ) : (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {media.map((item) => {
        const active = selectedUrl === item.url;
        return (
          <div
            key={item.id}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-default border bg-surface-subtle",
              active ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent/40",
            )}
          >
            <button
              type="button"
              aria-pressed={active}
              aria-label={item.filename ?? t("libraryTitle")}
              className="size-full"
              onClick={() => choose(item.url)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="size-full object-cover" />
            </button>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-bg/80 px-1 py-0.5 text-[10px] text-fg-muted">
              {item.filename ?? item.id.slice(0, 8)}
            </span>
            <button
              type="button"
              aria-label={t("deleteImage")}
              disabled={deletingId === item.id}
              className="absolute right-1 top-1 hidden size-6 items-center justify-center rounded-default border border-border bg-bg/90 text-danger group-hover:flex group-focus-within:flex"
              onClick={(event) => void onDelete(item.id, event)}
            >
              <Icon name="trash" className="text-xs" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );

  // Portalled: pickers are often rendered inside a form field's <label>, where a click on
  // any plain part of the dialog would otherwise activate the label's file input.
  return createPortal(
    <Modal
      open={open}
      title={presets ? t("logoLibraryTitle") : t("libraryTitle")}
      description={presets ? t("logoLibraryDesc") : t("libraryDesc")}
      onClose={onClose}
      footer={
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              void onUpload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={uploading}
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
      <div className="flex min-w-0 flex-col gap-3">
        {presets ? (
          <Tabs<PickerTab>
            label={t("libraryTabs")}
            value={tab}
            onChange={setTab}
            items={[
              { id: "media", label: t("tabMedia") },
              { id: "social", label: t("tabSocial") },
              { id: "emoji", label: t("tabEmoji") },
            ]}
          />
        ) : null}

        {presets || items.length > 8 ? (
          <div className="relative min-w-0">
            <label htmlFor={searchId} className="sr-only">
              {tab === "media" ? t("searchMedia") : t("searchLogos")}
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3 text-sm -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              autoComplete="off"
              placeholder={tab === "media" ? t("searchMedia") : t("searchLogos")}
              className="h-9 w-full py-2 pr-3 pl-9"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
            />
          </div>
        ) : null}

        {error ? <p className="m-0 text-xs text-danger">{error}</p> : null}

        {tab === "social" ? (
          <div role="tabpanel" className="flex min-w-0 flex-col gap-3">
            {social.length === 0 ? noMatches : null}
            {(["social", "contact"] as const).map((category) => {
              const list = social.filter((preset) => preset.category === category);
              return list.length > 0 ? (
                <section key={category} className="flex min-w-0 flex-col gap-2">
                  <h4 className="m-0 font-mono text-xs tracking-widest text-fg-subtle uppercase">
                    {category === "social" ? t("presetBrands") : t("presetContact")}
                  </h4>
                  {presetGrid(list)}
                </section>
              ) : null;
            })}
            <p className="m-0 text-[11px] leading-relaxed text-fg-subtle">{t("brandNotice")}</p>
          </div>
        ) : tab === "emoji" ? (
          <div role="tabpanel" className="flex min-w-0 flex-col gap-3">
            {emoji.length === 0 ? noMatches : presetGrid(emoji)}
            <p className="m-0 text-[11px] leading-relaxed text-fg-subtle">
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
