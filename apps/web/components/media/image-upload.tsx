"use client";

import { Icon } from "@/components/kit/icon";
import { Button } from "@/components/ui";
import { uploadWorkspaceMediaAction } from "@/app/(panel)/media/actions";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

type ImageUploadProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
};

export function ImageUpload({ value, onChange, disabled = false, hint }: ImageUploadProps) {
  const t = useTranslations("media");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(file: File | undefined): void {
    if (!file || disabled) {
      return;
    }
    setError(null);
    const form = new FormData();
    form.set("file", file);
    startTransition(async () => {
      const result = await uploadWorkspaceMediaAction(form);
      if (!result.ok) {
        setError(t(result.error === "media_type" || result.error === "media_size" ? result.error : "media_failed"));
        return;
      }
      onChange(result.data.url);
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-default border border-border bg-surface-subtle">
          {value ? (
            // Uploaded bytes are first-party; the path is always /api/media/{id}.
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
              onPick(event.target.files?.[0]);
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
  );
}
