"use client";

import { Icon } from "@/components/kit/icon";
import { Button, Modal } from "@/components/ui";
import type { MediaListItem } from "@/lib/media";
import { cn } from "@/lib/cx";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

type MediaPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  selectedUrl?: string;
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

function mediaErrorKey(code: string | undefined): "media_type" | "media_size" | "media_failed" {
  if (code === "media_type" || code === "media_size") {
    return code;
  }
  return "media_failed";
}

export function MediaPicker({ open, onClose, onSelect, selectedUrl }: MediaPickerProps) {
  const t = useTranslations("media");
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      onSelect(payload.data.url);
      onClose();
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

  return (
    <Modal
      open={open}
      title={t("libraryTitle")}
      description={t("libraryDesc")}
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
      <div className="flex min-w-0 flex-col gap-3 px-6 py-4">
        {error ? <p className="m-0 text-xs text-danger">{error}</p> : null}
        {loading ? (
          <p className="m-0 text-sm text-fg-muted">{t("libraryLoading")}</p>
        ) : items.length === 0 ? (
          <p className="m-0 text-sm text-fg-muted">{t("libraryEmpty")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((item) => {
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
                    className="size-full"
                    onClick={() => {
                      onSelect(item.url);
                      onClose();
                    }}
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
                    className="absolute right-1 top-1 hidden size-6 items-center justify-center rounded-default border border-border bg-bg/90 text-danger group-hover:flex"
                    onClick={(event) => void onDelete(item.id, event)}
                  >
                    <Icon name="trash" className="text-xs" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
