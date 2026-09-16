import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { PanelSessionProvider } from "@/components/providers/session-provider";
import { getPlatformBrand } from "@/lib/brand";
import { serverEnv } from "@/lib/env";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.nav");
  return { title: t("title") };
}

/**
 * The admin area reuses the panel shell but is gated on the platform role. Superadmins
 * always have a personal workspace (created on sign-up), so the shell's workspace
 * switcher keeps working here too.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [context, brand] = await Promise.all([requireWorkspace(), getPlatformBrand()]);

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
          kind: context.workspace.kind,
        },
        workspaces: context.workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          kind: workspace.kind,
        })),
        role: "superadmin",
        isSuperadmin: true,
        impersonatedBy: context.impersonatedBy,
        planName: context.plan.name,
        canCreateTeam: context.canCreateTeam,
        shortDomain: serverEnv().PLATFORM_SHORT_DOMAIN,
        brandName: brand.name,
        localeSwitcherEnabled: brand.localeSwitcherEnabled,
      }}
    >
      {children}
    </PanelSessionProvider>
  );
}
