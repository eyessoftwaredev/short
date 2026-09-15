import type { ReactNode } from "react";
import { PanelSessionProvider } from "@/components/providers/session-provider";
import { serverEnv } from "@/lib/env";
import type { PanelRole } from "@/lib/nav";
import { requireWorkspace } from "@/lib/session";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const context = await requireWorkspace();

  // Superadmins keep their workspace membership but the sidebar also shows the
  // Platform group, so the effective nav role is the platform one.
  const role: PanelRole = context.isSuperadmin ? "superadmin" : context.role;

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
        role,
        isSuperadmin: context.isSuperadmin,
        impersonatedBy: context.impersonatedBy,
        planName: context.plan.name,
        shortDomain: serverEnv().PLATFORM_SHORT_DOMAIN,
      }}
    >
      {children}
    </PanelSessionProvider>
  );
}
