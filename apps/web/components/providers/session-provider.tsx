"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PanelRole } from "@/lib/nav";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type SessionWorkspace = {
  id: string;
  name: string;
  slug: string;
  kind: "personal" | "team";
};

export type PanelSession = {
  user: SessionUser;
  workspace: SessionWorkspace;
  workspaces: SessionWorkspace[];
  /** Workspace membership role, or `superadmin` when the platform role applies. */
  role: PanelRole;
  isSuperadmin: boolean;
  impersonatedBy: string | null;
  planName: string;
  canCreateTeam: boolean;
  shortDomain: string;
  brandName: string;
  brandLogoSrc: string;
  brandWordmarkSrc?: string;
  brandHasWordmark: boolean;
  localeSwitcherEnabled: boolean;
  accountRestored: boolean;
};

const SessionContext = createContext<PanelSession | null>(null);

export function PanelSessionProvider({
  value,
  children,
}: {
  value: PanelSession;
  children: ReactNode;
}) {
  const memoized = useMemo(() => value, [value]);
  return <SessionContext.Provider value={memoized}>{children}</SessionContext.Provider>;
}

export function usePanelSession(): PanelSession {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("usePanelSession must be used within PanelSessionProvider");
  }
  return context;
}

export function initials(name: string, email: string): string {
  const source = name.trim() === "" ? email : name;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return `${first}${second}`.toUpperCase();
}
