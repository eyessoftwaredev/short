import { scheduleMillis } from "@short/core";

/**
 * What a visitor gets right now: `live` (the page shows), `scheduled` (published but the
 * start time is still ahead), `ended` (published but the end time passed) or `draft`.
 * Plain module (no "use client") so server pages can call it too.
 */
export type BioStatus = "live" | "scheduled" | "ended" | "draft";

export function bioStatusOf(
  page: {
    published: boolean;
    publishAt?: Date | string | number | null;
    unpublishAt?: Date | string | number | null;
  },
  now = Date.now(),
): BioStatus {
  if (!page.published) {
    return "draft";
  }
  const start = scheduleMillis(page.publishAt === "" ? null : page.publishAt);
  const end = scheduleMillis(page.unpublishAt === "" ? null : page.unpublishAt);
  if (start !== null && now < start) {
    return "scheduled";
  }
  if (end !== null && now > end) {
    return "ended";
  }
  return "live";
}
