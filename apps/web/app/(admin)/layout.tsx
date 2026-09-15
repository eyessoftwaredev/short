import type { ReactNode } from "react";
import { PanelSessionProvider } from "@/components/providers/session-provider";
import { serverEnv } from "@/lib/env";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";

/**
 * The admin area reuses the panel shell but is gated on the platform role. Superadmins
 * always have a personal workspace (created on sign-up), so the shell's workspace
 * switcher keeps working here too.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const context = await requireWorkspace();

  if (!context.isSuperadmin) {
    redirect("/dashboard?error=forbidden");
  }

  return (
    <PanelSessionProvider
      value={{
        user: context.user,
        workspace: {
          id: context.workspace.id,
          name: context.workspace.name,
          slug: context.workspace.slug,
        },
        workspaces: context.workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        })),
        role: "superadmin",
        isSuperadmin: true,
        impersonatedBy: context.impersonatedBy,
        planName: context.plan.name,
        shortDomain: serverEnv().PLATFORM_SHORT_DOMAIN,
      }}
    >
      {children}
    </PanelSessionProvider>
  );
}
