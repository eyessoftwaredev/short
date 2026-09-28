"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BrandLockup, BrandMark } from "@/components/brand/brand-mark";
import { Toaster } from "@/components/ui/toast";
import { usePanelSession } from "@/components/providers/session-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cx";
import { CreateTeamDialog } from "./create-team-dialog";
import { AccountRestoredBanner } from "./account-restored-banner";
import { CommandPalette } from "./command-palette";
import { ImpersonationBanner } from "./impersonation-banner";
import { MobileTabBar } from "./mobile-tab-bar";
import { MobileNavDrawer, Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type Crumb = { label: string; href?: string };

const COLLAPSE_KEY = "short-sidebar-collapsed";

/*
 * Every page renders its own PanelShell, so the shell remounts on navigation.
 * The collapsed flag is cached at module level after the first read, so later
 * mounts start in the right state instead of flashing open for a frame.
 */
let collapsedCache: boolean | null = null;

type PanelShellProps = {
  title: string;
  crumbs?: Crumb[];
  children: ReactNode;
  topbarActions?: ReactNode;
  /** Label of the topbar command palette trigger. */
  searchPlaceholder?: string;
  /**
   * Set false on screens that already own a search field, e.g. the links list: the
   * topbar then shows a compact palette button and `/` is left to the page.
   */
  searchable?: boolean;
  /** Extra classes on the `<main>` content column. */
  contentClassName?: string;
};

export function PanelShell({
  title,
  crumbs,
  children,
  topbarActions,
  searchPlaceholder,
  searchable,
  contentClassName,
}: PanelShellProps) {
  const [collapsed, setCollapsed] = useState(collapsedCache ?? false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const session = usePanelSession();
  const t = useTranslations("common");

  useEffect(() => {
    if (collapsedCache != null) {
      return;
    }
    try {
      collapsedCache = window.localStorage.getItem(COLLAPSE_KEY) === "1";
      setCollapsed(collapsedCache);
    } catch {
      /* private mode — fall back to expanded */
    }
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setPaletteOpen(false);
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      collapsedCache = next;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }, []);

  const switchWorkspace = useCallback(
    async (workspaceId: string): Promise<void> => {
      try {
        const result = await authClient.organization.setActive({ organizationId: workspaceId });
        if (result.error) {
          console.error("failed to switch workspace", result.error);
          return;
        }
        // Detail pages (/links/<id>, /qr/<id>/...) belong to the previous workspace and
        // would 404 after the switch, so fall back to the section's list.
        const section = pathname.split("/")[1];
        if (section && pathname.split("/").length > 2 && section !== "settings" && section !== "docs") {
          router.push(`/${section}`);
        }
        router.refresh();
      } catch (error) {
        console.error("failed to switch workspace", error);
      }
    },
    [pathname, router],
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await authClient.signOut();
      router.push("/login");
    } catch (error) {
      console.error("failed to sign out", error);
    }
  }, [router]);

  const brand = (
    <BrandLockup
      name={session.brandName}
      href="/dashboard"
      logoSrc={session.brandLogoSrc}
      wordmarkSrc={session.brandWordmarkSrc}
      hasWordmark={session.brandHasWordmark}
    />
  );

  const brandCompact = (
    <Link href="/dashboard" aria-label={session.brandName} className="flex no-underline">
      <BrandMark logoSrc={session.brandLogoSrc} />
    </Link>
  );

  const sidebarHandlers = {
    brand,
    brandCompact,
    onSwitchWorkspace: (id: string) => {
      void switchWorkspace(id);
    },
    onCreateTeam: () => setCreateTeamOpen(true),
    onSignOut: () => {
      void signOut();
    },
  };

  return (
    <div className="panel-root flex min-h-screen bg-canvas">
      <a
        href="#panel-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-toast focus:rounded-default focus:border focus:border-border focus:bg-elevated focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:no-underline focus:shadow-pop"
      >
        {t("skipToContent")}
      </a>

      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} {...sidebarHandlers} />
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        {...sidebarHandlers}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          crumbs={crumbs ?? [{ label: session.workspace.name }]}
          current={title}
          actions={topbarActions}
          searchPlaceholder={searchPlaceholder}
          searchable={searchable}
          onMenuClick={() => setMobileNavOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onSignOut={() => {
            void signOut();
          }}
        />
        {/*
          One content column for every page: max 1280px, 16/24/32px gutters,
          24px between blocks. Pages never set their own width or padding.
        */}
        <main
          id="panel-content"
          tabIndex={-1}
          className={cn(
            "page-container flex min-w-0 flex-1 flex-col gap-6 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] outline-none sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 lg:pb-12",
            contentClassName,
          )}
        >
          <ImpersonationBanner />
          <AccountRestoredBanner />
          {children}
        </main>
      </div>

      <MobileTabBar onOpenMenu={() => setMobileNavOpen(true)} />
      <Toaster />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        slashShortcut={searchable !== false}
      />

      <CreateTeamDialog
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onCreated={(workspaceId) => {
          void switchWorkspace(workspaceId);
        }}
      />
    </div>
  );
}
