import { redirect } from "next/navigation";

/** Bookmarks and the old sidebar href land here; the tab lives on /settings. */
export default function SettingsWorkspaceRedirect() {
  redirect("/settings?tab=workspace");
}
