/**
 * Locale is a host-only cookie. A leftover Domain= cookie plus a host-only
 * cookie both get sent; Next then reads the first value and the switcher snaps
 * back to TR.
 */
export function writeClientCookie(name: string, value: string, maxAgeSeconds = 31_536_000): void {
  const encoded = encodeURIComponent(value);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const host = window.location.hostname;
  const apex = host.replace(/^(www|app)\./, "");

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  if (host !== "localhost" && !host.endsWith(".localhost") && apex.includes(".")) {
    document.cookie = `${name}=; Path=/; Max-Age=0; Domain=${apex}; SameSite=Lax${secure}`;
  }

  const parts = [`${name}=${encoded}`, "Path=/", `Max-Age=${maxAgeSeconds}`, "SameSite=Lax"];
  if (window.location.protocol === "https:") {
    parts.push("Secure");
  }
  document.cookie = parts.join("; ");
}
