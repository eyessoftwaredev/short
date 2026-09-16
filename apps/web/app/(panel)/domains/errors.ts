export function domainActionError(
  error: string,
  fieldErrors: Record<string, string[]> | undefined,
  host: string,
  t: (key: string, values?: Record<string, string | number>) => string,
  te: (key: string, values?: Record<string, string | number>) => string,
  actionMessage: (code: string | undefined | null) => string,
): string {
  if (error === "domain_taken") {
    return te("domain_taken", { host });
  }
  if (error === "domain_www") {
    return t("noWww");
  }
  if (error === "cloudflare_rejected") {
    return t("cloudflareRejected", { message: fieldErrors?.detail?.[0] ?? "" });
  }
  if (error === "cloudflare_check_failed") {
    return t("cloudflareCheckFailed", { message: fieldErrors?.detail?.[0] ?? "" });
  }
  if (error === "cf_token_invalid") {
    return t("cfTokenInvalid");
  }
  if (error === "cf_no_zone") {
    return t("cfNoZone", { host: fieldErrors?.host?.[0] ?? host });
  }
  if (error === "cf_not_connected") {
    return t("cfNotConnected");
  }
  if (error === "cf_dns_failed") {
    return t("cfDnsFailed", { message: fieldErrors?.detail?.[0] ?? "" });
  }
  return actionMessage(error);
}
