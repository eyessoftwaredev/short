"use client";

import { Icon } from "@/components/kit/icon";
import { MediaPicker } from "@/components/media/media-picker";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cx";
import { useTranslations } from "next-intl";
import { useRef, useState, type DragEvent } from "react";
import {
  ACCEPTED_IMAGE_TYPES,
  CHECKERBOARD,
  droppedFile,
  uploadMediaFile,
  type MediaErrorKey,
} from "./upload";

type ImageUploadProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
  /** Offers the built-in QR logo libraries (brand icons, emoji) in the picker. */
  presets?: boolean;
  /**
   * Colour behind the thumbnails, e.g. the QR background, so a logo is judged on what
   * it will really sit on. Defaults to a neutral transparency checkerboard.
   */
  previewBackground?: string;
};

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  hint,
  presets = false,
  previewBackground,
}: ImageUploadProps) {
  const t = useTranslations("media");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [error, setError] = useState<MediaErrorKey | null>(null);
  const [dragging, setDragging] = useState(false);

  async function onPick(file: File | undefined): Promise<void> {
    if (!file || disabled) {
      return;
    }
    setError(null);
    setPending(true);
    const result = await uploadMediaFile(file);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(result.url);
  }

  const dropProps = disabled
    ? {}
    : {
        onDragOver: (event: DragEvent) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            setDragging(true);
          }
        },
        onDragLeave: () => setDragging(false),
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          setDragging(false);
          void onPick(droppedFile(event));
        },
      };

  return (
    <>
      <div className="flex min-w-0 flex-col gap-2" {...dropProps}>
        <div
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-md transition-colors duration-150",
            dragging && "bg-accent-tint ring-2 ring-accent-border",
          )}
        >
          <div
            className={cn(
              "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border",
              previewBackground ? null : value ? CHECKERBOARD : "bg-surface",
            )}
            style={previewBackground ? { background: previewBackground } : undefined}
          >
            {pending ? (
              <Icon name="spinner" className="text-sm text-fg-subtle" />
            ) : value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="size-full object-contain p-1" />
            ) : (
              <Icon name="image" className="text-base text-fg-disabled" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                disabled={disabled || pending}
                onChange={(event) => {
                  void onPick(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                leadingIcon="cloud-up"
                loading={pending}
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                {pending ? t("uploading") : value ? t("replace") : t("upload")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                leadingIcon={presets ? "sparkles" : "image"}
                disabled={disabled || pending}
                onClick={() => setLibraryOpen(true)}
              >
                {presets ? t("logoLibrary") : t("library")}
              </Button>
              {value ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  leadingIcon="trash"
                  disabled={disabled || pending}
                  onClick={() => onChange("")}
                >
                  {t("remove")}
                </Button>
              ) : null}
            </div>
            {error ? (
              <p role="alert" className="m-0 flex items-start gap-1.5 text-[13px] leading-5 text-danger">
                <Icon name="circle-xmark" className="mt-0.5 text-xs" />
                <span className="min-w-0">{t(error)}</span>
              </p>
            ) : hint ? (
              <p className="m-0 text-[13px] leading-5 text-fg-subtle">{hint}</p>
            ) : null}
          </div>
        </div>
      </div>

      <MediaPicker
        open={libraryOpen}
        presets={presets}
        selectedUrl={value}
        previewBackground={previewBackground}
        onClose={() => setLibraryOpen(false)}
        onSelect={onChange}
      />
    </>
  );
}
