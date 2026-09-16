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
