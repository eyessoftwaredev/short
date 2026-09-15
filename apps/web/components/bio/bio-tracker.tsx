"use client";

import { useEffect } from "react";

type BioTrackerProps = {
  biopageId: string;
  /** Absolute panel origin, because the bio page runs on the customer's own hostname. */
  endpoint: string;
};

function send(endpoint: string, payload: Record<string, string>): void {
  const body = JSON.stringify(payload);
  // `text/plain` keeps this a CORS-simple request, so no preflight on custom hostnames.
  if (navigator.sendBeacon?.(endpoint, new Blob([body], { type: "text/plain" }))) {
    return;
  }
  void fetch(endpoint, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(
    () => undefined,
  );
}

/**
 * Outbound block clicks, written to the same ClickHouse `events` table as redirects.
 * Page views are not sent from here: the redirect worker already records a `bio_view`
 * when it proxies the request, and duplicating it would double every view count.
 */
export function BioTracker({ biopageId, endpoint }: BioTrackerProps) {
  useEffect(() => {
    function onClick(event: MouseEvent): void {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[data-bio-block]");
      if (!anchor) {
        return;
      }
      send(endpoint, {
        type: "bio_click",
        biopageId,
        blockId: anchor.dataset.bioBlock ?? "",
        destination: anchor.href,
      });
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [biopageId, endpoint]);

  return null;
}
