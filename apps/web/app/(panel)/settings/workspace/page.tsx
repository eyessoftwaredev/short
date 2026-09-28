import { redirect } from "next/navigation";

/** Bookmarks and the old sidebar href land here; the workspace name lives on General now. */
export default function SettingsWorkspaceRedirect() {
  redirect("/settings?tab=general");
}
