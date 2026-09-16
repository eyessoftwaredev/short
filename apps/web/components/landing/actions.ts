"use server";

import { normalizeDestination, writeDraftDestination } from "@/lib/draft-link";

export async function saveLandingDraft(raw: string): Promise<{ ok: true; href: string }> {
  const url = normalizeDestination(raw);
  if (url) {
    await writeDraftDestination(url);
  }
  return { ok: true, href: "/register" };
}
