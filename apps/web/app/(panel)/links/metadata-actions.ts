"use server";

import { z } from "zod";
import { fail, fromZodError, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { fetchLinkMetadata, LinkMetadataError, type FetchedLinkMetadata } from "@/lib/link-metadata";
import { rateLimit } from "@/lib/redis";
import { canWriteWorkspace, requireWorkspace } from "@/lib/session";

/** Per signed-in user; results are cached for 10 minutes, so retyping costs nothing. */
const METADATA_REQUESTS_PER_MINUTE = 20;

const urlSchema = z.string().trim().min(1).max(2048);

/**
 * Reads title / description / preview image / favicon / site name from a destination
 * for prefilling the link editor. `image` is a remote URL for display only: a link's
 * stored `image` must still be an uploaded media path.
 *
 * Errors: `invalid_url` (not a public http(s) URL), `metadata_unavailable` (unreachable,
 * timeout, non-2xx), `rate_limited`, `forbidden`.
 */
export async function fetchLinkMetadataAction(url: string): Promise<ActionResult<FetchedLinkMetadata>> {
  try {
    const context = await requireWorkspace();
    if (!canWriteWorkspace(context)) {
      return fail("forbidden");
    }
    const parsed = urlSchema.safeParse(url);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const limit = await rateLimit(`link-meta:${context.user.id}`, METADATA_REQUESTS_PER_MINUTE, 60);
    if (!limit.allowed) {
      return fail("rate_limited");
    }

    return ok(await fetchLinkMetadata(parsed.data));
  } catch (error) {
    if (error instanceof LinkMetadataError) {
      return fail(error.code === "invalid_url" ? "invalid_url" : "metadata_unavailable");
    }
    return toActionError(error);
  }
}
