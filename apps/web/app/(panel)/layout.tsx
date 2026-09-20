import type { ReactNode } from "react";
import { PanelSessionProvider } from "@/components/providers/session-provider";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { BrandPreload } from "@/components/brand/brand-preload";
import { serverEnv } from "@/lib/env";
import type { PanelRole } from "@/lib/nav";
import { requireWorkspace } from "@/lib/session";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const [context, brand, brandSources] = await Promise.all([
    requireWorkspace(),
    getPlatformBrand(),
    getBrandLockupSources(),
  ]);

  // Superadmins keep their workspace membership but the sidebar also shows the
  // Platform group, so the effective nav role is the platform one.
  const role: PanelRole = context.isSuperadmin ? "superadmin" : context.role;

  return (
    <>
      <BrandPreload sources={brandSources} />
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
        role,
        isSuperadmin: context.isSuperadmin,
        impersonatedBy: context.impersonatedBy,
        planName: context.plan.name,
        canCreateTeam: context.canCreateTeam,
        shortDomain: serverEnv().PLATFORM_SHORT_DOMAIN,
        brandName: brand.name,
        brandLogoSrc: brandSources.logoSrc,
        brandWordmarkSrc: brandSources.wordmarkSrc,
        brandHasWordmark: brandSources.hasWordmark,
        localeSwitcherEnabled: brand.localeSwitcherEnabled,
        accountRestored: context.accountRestored,
      }}
    >
      {children}
    </PanelSessionProvider>
    </>
  );
}
