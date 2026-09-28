"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "@/components/ui";

export type QrDownloadFormat = "png" | "svg" | "pdf";

type DownloadOutcome = "ok" | "logo" | "failed";

function fileNameFrom(disposition: string | null, fallback: string): string {
  const match = disposition ? /filename="([^"]+)"/i.exec(disposition) : null;
  return match?.[1] ?? fallback;
}

/**
 * Fetches the export and saves it. A plain `<a href>` navigated the tab to a JSON error
 * page whenever rendering failed (for example a logo that could not be embedded), which
 * left people staring at `{"error":"logo_embed_failed"}`; this reports it instead.
 */
async function fetchAndSave(id: string, format: QrDownloadFormat, size?: number): Promise<DownloadOutcome> {
  const params = new URLSearchParams({ format });
  if (size) {
    params.set("size", String(size));
  }
  let response: Response;
  try {
    response = await fetch(`/api/qr/${id}?${params.toString()}`, { cache: "no-store" });
  } catch {
    return "failed";
  }
  if (!response.ok) {
    return response.status === 422 ? "logo" : "failed";
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileNameFrom(response.headers.get("content-disposition"), `qr-code.${format}`);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Some browsers read the blob after click() returns; revoke once they are done.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "ok";
}

/** Download state plus a `download(id, format, size?)` that toasts its own failures. */
export function useQrDownload() {
  const t = useTranslations("qr");
  const [pending, setPending] = useState<QrDownloadFormat | null>(null);

  const download = useCallback(
    async (id: string, format: QrDownloadFormat, size?: number): Promise<boolean> => {
      setPending(format);
      const outcome = await fetchAndSave(id, format, size);
      setPending(null);
      if (outcome === "logo") {
        toast.error(t("downloadLogoFailed"), t("downloadLogoFailedBody"));
        return false;
      }
      if (outcome === "failed") {
        toast.error(t("downloadFailed"), t("downloadFailedBody"));
        return false;
      }
      return true;
    },
    [t],
  );

  return { download, pending };
}
