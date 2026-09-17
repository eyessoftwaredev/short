"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand-mark";
import { usePanelSession } from "@/components/providers/session-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cx";
import { CreateTeamDialog } from "./create-team-dialog";
import { AccountRestoredBanner } from "./account-restored-banner";
import { ImpersonationBanner } from "./impersonation-banner";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type Crumb = { label: string; href?: string };

const COLLAPSE_KEY = "short-sidebar-collapsed";

type PanelShellProps = {
  title: string;
  crumbs?: Crumb[];
  children: ReactNode;
  topbarActions?: ReactNode;
  /** Placeholder for the topbar search field, e.g. "Search domains". */
  searchPlaceholder?: string;
  /** Set false on screens that already own a search field, e.g. the links list. */
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
  const [collapsed, setCollapsed] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const router = useRouter();
  const session = usePanelSession();
  const t = useTranslations("common");

  // Read after mount rather than during render: the server has no idea what the
  // user last chose, and guessing would hydrate a different sidebar width.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* private mode — fall back to expanded */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
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
        await authClient.organization.setActive({ organizationId: workspaceId });
        router.refresh();
      } catch (error) {
        console.error("failed to switch workspace", error);
      }
    },
    [router],
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await authClient.signOut();
      router.push("/login");
    } catch (error) {
      console.error("failed to sign out", error);
    }
  }, [router]);

  return (
    // `panel-root` scopes the chart tooltip and table chrome declared in
    // globals.css to the product, leaving the /docs catalog on its own styles.
    <div className="panel-root flex min-h-screen bg-bg">
      <a
        href="#panel-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-toast focus:rounded-default focus:border focus:border-border focus:bg-bg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:no-underline focus:shadow-pop"
      >
        {t("skipToContent")}
      </a>

      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        onSwitchWorkspace={(id) => {
          void switchWorkspace(id);
        }}
        onCreateTeam={() => setCreateTeamOpen(true)}
        onSignOut={() => {
          void signOut();
        }}
        brand={<BrandLockup name={session.brandName} href="/dashboard" />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          crumbs={crumbs ?? [{ label: session.workspace.name }]}
          current={title}
          actions={topbarActions}
          searchPlaceholder={searchPlaceholder}
          searchable={searchable}
        />
        {/*
          `gap-6` is the page rhythm: every section on every screen is one
          gap apart, so the eye never has to work out whether two blocks are
          related from their spacing.
        */}
        <main
          id="panel-content"
          tabIndex={-1}
          className={cn("flex min-w-0 flex-1 flex-col gap-6 p-6", contentClassName)}
        >
          <ImpersonationBanner />
          <AccountRestoredBanner />
          {children}
        </main>
      </div>
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
