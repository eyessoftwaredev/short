/**
 * Client-side upload to POST /api/media, shared by the image field and the library.
 * The server re-checks everything; the early checks here only save a slow round trip
 * for a file that would be refused anyway.
 */

/** Mirrors `MAX_MEDIA_BYTES` in lib/media.ts (that module is server-only). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/svg+xml";

/**
 * Transparency checkerboard behind image thumbnails, built from theme tokens so it
 * works in light and dark mode (a dark logo on a plain dark tile used to vanish).
 */
export const CHECKERBOARD =
  "bg-[repeating-conic-gradient(var(--surface-strong)_0_25%,var(--bg)_0_50%)] bg-[length:14px_14px]";

const EXTENSIONS = /\.(png|jpe?g|webp|svg)$/i;

export type MediaErrorKey = "media_type" | "media_size" | "media_failed" | "media_rate_limited";

export type UploadResult =
  | { ok: true; id: string; url: string; contentType: string }
  | { ok: false; error: MediaErrorKey };

type UploadResponse = {
  data?: { id: string; url: string; contentType: string };
  error?: { code?: string };
};

export function mediaErrorKey(code: string | undefined): MediaErrorKey {
  if (code === "media_type" || code === "media_size") {
    return code;
  }
  if (code === "rate_limited") {
    return "media_rate_limited";
  }
  return "media_failed";
}

/** A quick pre-flight on type and size; the server sniffs the bytes regardless. */
export function precheckImage(file: File): MediaErrorKey | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return "media_size";
  }
  // Some systems send no type, a generic one or "image/jpg"; the extension is the
  // fallback hint.
  const unknown = file.type === "" || file.type === "application/octet-stream";
  const typeOk = unknown
    ? EXTENSIONS.test(file.name)
    : ACCEPTED_IMAGE_TYPES.split(",").includes(file.type) || file.type === "image/jpg";
  return typeOk ? null : "media_type";
}

export async function uploadMediaFile(file: File): Promise<UploadResult> {
  const early = precheckImage(file);
  if (early) {
    return { ok: false, error: early };
  }
  try {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/media", { method: "POST", body: form });
    const payload = (await response.json().catch(() => ({}))) as UploadResponse;
    if (!response.ok || !payload.data) {
      return {
        ok: false,
        error: response.status === 413 ? "media_size" : mediaErrorKey(payload.error?.code),
      };
    }
    return { ok: true, ...payload.data };
  } catch {
    return { ok: false, error: "media_failed" };
  }
}

/** The first file of a drop, if the drag carried files at all. */
export function droppedFile(event: { dataTransfer: DataTransfer | null }): File | undefined {
  return event.dataTransfer?.files?.[0];
}
