"use client";

import { Icon } from "@/components/kit/icon";
import { MediaPicker } from "@/components/media/media-picker";
import { Button } from "@/components/ui";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

type ImageUploadProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
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

export function ImageUpload({ value, onChange, disabled = false, hint }: ImageUploadProps) {
  const t = useTranslations("media");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined): Promise<void> {
    if (!file || disabled) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const payload = (await response.json()) as UploadResponse & ErrorResponse;
      if (!response.ok) {
        setError(t(mediaErrorKey(payload.error?.code)));
        return;
      }
      onChange(payload.data.url);
    } catch {
      setError(t("media_failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-default border border-border bg-surface-subtle">
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="size-full object-cover" />
            ) : (
              <Icon name="image" className="text-fg-disabled" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              disabled={disabled || pending}
              onChange={(event) => {
                void onPick(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              disabled={disabled || pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? t("uploading") : value ? t("replace") : t("upload")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || pending}
              onClick={() => setLibraryOpen(true)}
            >
              {t("library")}
            </Button>
            {value ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || pending}
                onClick={() => onChange("")}
              >
                {t("remove")}
              </Button>
            ) : null}
          </div>
        </div>
        {hint && !error ? <p className="m-0 text-xs text-fg-subtle">{hint}</p> : null}
        {error ? <p className="m-0 text-xs text-danger">{error}</p> : null}
      </div>

      <MediaPicker
        open={libraryOpen}
        selectedUrl={value}
        onClose={() => setLibraryOpen(false)}
        onSelect={onChange}
      />
    </>
  );
}
