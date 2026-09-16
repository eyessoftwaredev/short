/** Pending verification lives at a stable path. Email never belongs in the URL. */
export function verifyPendingPath(invite = ""): string {
  if (invite === "") {
    return "/verify";
  }
  return `/verify?invite=${encodeURIComponent(invite)}`;
}
