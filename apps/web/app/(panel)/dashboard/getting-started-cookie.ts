/**
 * Shared by the dashboard (reads it on the server, so a dismissed card never
 * flashes) and the card itself (writes it in the browser). One cookie per
 * workspace; the value is the user id, so another account signing in on the
 * same browser still gets its own checklist.
 */
export function gettingStartedCookieName(workspaceId: string): string {
  return `short_gs_${workspaceId.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

export const GETTING_STARTED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
