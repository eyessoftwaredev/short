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

export type WebhookDeliveryView = {
  id: string;
  event: string;
  status: number | null;
  error: string | null;
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
  deliveries: WebhookDeliveryView[];
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

export const SETTINGS_TABS = ["profile", "team", "api", "webhooks"] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number];

const SETTINGS_TAB_ALIASES: Record<string, SettingsTabId> = {
  workspace: "team",
  members: "team",
  account: "team",
};

export function parseSettingsTab(value: string | string[] | undefined): SettingsTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return "profile";
  }
  if (SETTINGS_TABS.includes(raw as SettingsTabId)) {
    return raw as SettingsTabId;
  }
  return SETTINGS_TAB_ALIASES[raw] ?? "profile";
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
