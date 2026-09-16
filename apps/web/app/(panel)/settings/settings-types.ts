import type { WebhookEvent } from "@short/core";

export type MemberView = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
};

export type InviteView = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

export type KeyView = {
  id: string;
  name: string | null;
  start: string | null;
  enabled: boolean;
  requestCount: number;
  lastRequest: string | null;
  createdAt: string;
};

export type WebhookView = {
  id: string;
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
  lastStatus: number | null;
  lastDeliveryAt: string | null;
  lastError: string | null;
};

/** Matches the shape every server action in this folder resolves to. */
export type ActionOutcome = { ok: boolean; error?: string };

export type RunAction = (action: () => Promise<ActionOutcome>, message?: string) => void;

export type ConfirmRequest = {
  title: string;
  description: string;
  /** Spelled out so nobody clicks through without reading what breaks. */
  consequences?: readonly string[];
  confirmLabel: string;
  onConfirm: () => void;
};

export type RequestConfirm = (request: ConfirmRequest) => void;

export const SETTINGS_TABS = ["profile", "workspace", "members", "api", "webhooks"] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number];

export function parseSettingsTab(value: string | string[] | undefined): SettingsTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  return SETTINGS_TABS.includes(raw as SettingsTabId) ? (raw as SettingsTabId) : "profile";
}

export const ROLE_COPY = {
  owner: { label: "roleOwner", summary: "roleOwnerSummary" },
  admin: { label: "roleAdmin", summary: "roleAdminSummary" },
  member: { label: "roleMember", summary: "roleMemberSummary" },
} as const;

export type RoleId = keyof typeof ROLE_COPY;

export function isRoleId(role: string): role is RoleId {
  return role === "owner" || role === "admin" || role === "member";
}
