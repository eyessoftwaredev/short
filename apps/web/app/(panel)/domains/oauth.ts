/** `type` of the message the Cloudflare OAuth callback posts back to the panel. */
export const OAUTH_MESSAGE_TYPE = "short-cf-oauth";

/**
 * Same-origin BroadcastChannel the callback also posts on. Cloudflare's consent page can
 * sever `window.opener` (Cross-Origin-Opener-Policy), and then postMessage never arrives.
 */
export const OAUTH_CHANNEL = "short-cf-oauth";

export function oauthStartPath(domainId?: string, popup = false): string {
  const params = new URLSearchParams();
  if (popup) {
    params.set("popup", "1");
  }
  if (domainId) {
    params.set("domainId", domainId);
  }
  return `/api/integrations/cloudflare?${params.toString()}`;
}
