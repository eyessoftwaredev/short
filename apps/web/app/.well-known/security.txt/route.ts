import { contactEmails } from "@/lib/contact";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** RFC 9116 security contact, so researchers know where to report vulnerabilities. */
export function GET(): Response {
  const { security } = contactEmails();
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const origin = serverEnv().APP_URL.replace(/\/$/, "");
  const body = [
    `Contact: mailto:${security}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en, tr",
    `Policy: ${origin}/terms`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" },
  });
}
