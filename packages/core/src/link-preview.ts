import { isBeforeLinkStart, isLinkExpired, type LinkKvRecord } from "./kv";
import { isSafeDestination } from "./url";

/**
 * What the `<slug>+` preview page may show.
 * - `available`: destination, title and a button to the tracked short link.
 * - `protected`: the link exists but sits behind a password; nothing about the target.
 * - `unavailable`: missing, disabled, scheduled, expired or out of clicks. All of them
 *   look identical so a preview never reveals that a slug is taken or where it pointed.
 */
export type LinkPreviewState = "available" | "protected" | "unavailable";

export function linkPreviewState(link: LinkKvRecord | null, now: number): LinkPreviewState {
  if (!link || link.disabled || isBeforeLinkStart(link, now) || isLinkExpired(link, now)) {
    return "unavailable";
  }
  if (link.passwordHash) {
    return "protected";
  }
  return isSafeDestination(link.destination) ? "available" : "unavailable";
}

/** Targeting, A/B splits and app deep links mean visitors may not all land on one URL. */
export function linkDestinationVaries(
  link: Pick<LinkKvRecord, "rules" | "abVariants" | "iosDestination" | "androidDestination">,
): boolean {
  return (
    link.rules.length > 0 ||
    link.abVariants.length > 1 ||
    Boolean(link.iosDestination) ||
    Boolean(link.androidDestination)
  );
}
