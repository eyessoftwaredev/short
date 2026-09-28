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

export type WorkspaceView = { id: string; name: string; slug: string; kind: "personal" | "team" };

/** Matches the shape every server action in this folder resolves to. */
export type ActionOutcome = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Runs a server action, toasts the outcome and refreshes the page on success.
 * Resolves to whether it worked, so a dialog can stay open (and retry) on failure.
 */
export type RunAction = (action: () => Promise<ActionOutcome>, message?: string) => Promise<boolean>;

export type ConfirmRequest = {
  title: string;
  description: string;
  /** Spelled out so nobody clicks through without reading what breaks. */
  consequences?: readonly string[];
  confirmLabel: string;
  /** Current-password field for irreversible account actions. */
  requirePassword?: boolean;
  /** Resolve `true` to close the dialog; `false` keeps it open so the user can retry. */
  onConfirm: (password?: string) => Promise<boolean> | boolean | void;
};

export type RequestConfirm = (request: ConfirmRequest) => void;

export const SETTINGS_TABS = [
  "general",
  "links",
  "notifications",
  "team",
  "api",
  "webhooks",
  "pixels",
  "security",
  "danger",
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number];

/** Old tab names, bookmarks and links from before the settings were split up. */
const SETTINGS_TAB_ALIASES: Record<string, SettingsTabId> = {
  profile: "general",
  workspace: "general",
  account: "general",
  members: "team",
  defaults: "links",
  "link-defaults": "links",
  notification: "notifications",
  emails: "notifications",
  keys: "api",
  "api-keys": "api",
  hooks: "webhooks",
  pixel: "pixels",
  password: "security",
  "2fa": "security",
  dangerous: "danger",
};

export function parseSettingsTab(value: string | string[] | undefined): SettingsTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return "general";
  }
  if (SETTINGS_TABS.includes(raw as SettingsTabId)) {
    return raw as SettingsTabId;
  }
  return SETTINGS_TAB_ALIASES[raw] ?? "general";
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
