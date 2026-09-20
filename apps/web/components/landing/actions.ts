"use server";

import { createLandingShortLink, type LandingShortenResult } from "@/lib/landing-shorten";

export async function shortenLandingUrl(raw: string): Promise<LandingShortenResult> {
  return createLandingShortLink(raw);
}
