/**
 * Browser cookie write used by the locale switcher. Apex landings live on
 * short.ky / kisa.ly while the panel is app.*; a host-only cookie set on the
 * apex never reaches the origin after the site worker proxies the request.
 */
export function writeClientCookie(name: string, value: string, maxAgeSeconds = 31_536_000): void {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
  ];
  if (window.location.protocol === "https:") {
    parts.push("Secure");
  }
  const host = window.location.hostname;
  if (host !== "localhost" && !host.endsWith(".localhost") && host.includes(".")) {
    parts.push(`Domain=${host.replace(/^(www|app)\./, "")}`);
  }
  document.cookie = parts.join("; ");
}
