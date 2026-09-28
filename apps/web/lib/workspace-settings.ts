import { LINK_OPEN_MODES, type LinkOpenMode, type UtmParams } from "@short/core";
import {
  and,
  eq,
  folders,
  getDb,
  utmTemplates,
  workspaceSettings,
  type WorkspaceSettingsRow,
} from "@short/db";
import { z } from "zod";
import type { LinkFormValues } from "./link-form";

/** Link defaults and notification switches; a workspace without a row gets these. */
export type WorkspaceSettings = {
  defaultOpenMode: LinkOpenMode;
  defaultUtmTemplateId: string | null;
  defaultNoIndex: boolean;
  defaultForwardQuery: boolean;
  defaultFolderId: string | null;
  /** Email owners/admins when links turn broken. */
  healthAlerts: boolean;
  /** Weekly summary email to owners/admins. */
  weeklyDigest: boolean;
  /** Null until someone saves the settings. */
  updatedAt: string | null;
};

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  defaultOpenMode: "auto",
  defaultUtmTemplateId: null,
  defaultNoIndex: true,
  defaultForwardQuery: false,
  defaultFolderId: null,
  healthAlerts: true,
  weeklyDigest: true,
  updatedAt: null,
};

/** Every field optional: a save only touches what the form sent. */
export const workspaceSettingsInputSchema = z
  .object({
    defaultOpenMode: z.enum(LINK_OPEN_MODES),
    defaultUtmTemplateId: z.string().uuid().nullable(),
    defaultNoIndex: z.boolean(),
    defaultForwardQuery: z.boolean(),
    defaultFolderId: z.string().uuid().nullable(),
    healthAlerts: z.boolean(),
    weeklyDigest: z.boolean(),
  })
  .partial();

export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsInputSchema>;

function toSettings(row: WorkspaceSettingsRow): WorkspaceSettings {
  return {
    defaultOpenMode: row.defaultOpenMode,
    defaultUtmTemplateId: row.defaultUtmTemplateId,
    defaultNoIndex: row.defaultNoIndex,
    defaultForwardQuery: row.defaultForwardQuery,
    defaultFolderId: row.defaultFolderId,
    healthAlerts: row.healthAlerts,
    weeklyDigest: row.weeklyDigest,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
  const [row] = await getDb()
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1);
  return row ? toSettings(row) : { ...DEFAULT_WORKSPACE_SETTINGS };
}

/**
 * Upserts the given fields. Folder and template ids must belong to this workspace;
 * throws `Error("Folder not found")` / `Error("UTM template not found")` otherwise.
 */
export async function saveWorkspaceSettings(
  workspaceId: string,
  patch: WorkspaceSettingsInput,
): Promise<WorkspaceSettings> {
  const db = getDb();

  if (patch.defaultFolderId) {
    const [folder] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, patch.defaultFolderId), eq(folders.workspaceId, workspaceId)))
      .limit(1);
    if (!folder) {
      throw new Error("Folder not found");
    }
  }
  if (patch.defaultUtmTemplateId) {
    const [template] = await db
      .select({ id: utmTemplates.id })
      .from(utmTemplates)
      .where(and(eq(utmTemplates.id, patch.defaultUtmTemplateId), eq(utmTemplates.workspaceId, workspaceId)))
      .limit(1);
    if (!template) {
      throw new Error("UTM template not found");
    }
  }

  const values = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as WorkspaceSettingsInput;
  const now = new Date();

  const [row] = await db
    .insert(workspaceSettings)
    .values({ workspaceId, ...values, updatedAt: now })
    .onConflictDoUpdate({ target: workspaceSettings.workspaceId, set: { ...values, updatedAt: now } })
    .returning();
  if (!row) {
    throw new Error("Workspace settings upsert returned no row");
  }
  return toSettings(row);
}

/** The defaults a new link starts from, with the default UTM template resolved. */
export type LinkDefaults = {
  openMode: LinkOpenMode;
  noIndex: boolean;
  forwardQuery: boolean;
  folderId: string | null;
  utmTemplateId: string | null;
  utm: UtmParams | null;
};

export async function getLinkDefaults(workspaceId: string): Promise<LinkDefaults> {
  const settings = await getWorkspaceSettings(workspaceId);
  let utm: UtmParams | null = null;
  if (settings.defaultUtmTemplateId) {
    const [template] = await getDb()
      .select({ utm: utmTemplates.utm })
      .from(utmTemplates)
      .where(
        and(eq(utmTemplates.id, settings.defaultUtmTemplateId), eq(utmTemplates.workspaceId, workspaceId)),
      )
      .limit(1);
    utm = template?.utm ?? null;
  }
  return {
    openMode: settings.defaultOpenMode,
    noIndex: settings.defaultNoIndex,
    forwardQuery: settings.defaultForwardQuery,
    folderId: settings.defaultFolderId,
    utmTemplateId: settings.defaultUtmTemplateId,
    utm,
  };
}

export type LinkFormDefaults = Pick<
  LinkFormValues,
  | "openMode"
  | "noIndex"
  | "forwardQuery"
  | "folderId"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign"
  | "utmTerm"
  | "utmContent"
>;

/**
 * For prefilling the "new link" editor: spread over `emptyLinkForm(domainId)`.
 * `{ ...emptyLinkForm(id), ...linkFormDefaults(await getLinkDefaults(workspaceId)) }`
 */
export function linkFormDefaults(defaults: LinkDefaults): LinkFormDefaults {
  return {
    openMode: defaults.openMode,
    noIndex: defaults.noIndex,
    forwardQuery: defaults.forwardQuery,
    folderId: defaults.folderId ?? "",
    utmSource: defaults.utm?.utm_source ?? "",
    utmMedium: defaults.utm?.utm_medium ?? "",
    utmCampaign: defaults.utm?.utm_campaign ?? "",
    utmTerm: defaults.utm?.utm_term ?? "",
    utmContent: defaults.utm?.utm_content ?? "",
  };
}

/**
 * Server-side defaults for links created without an editor (API v1, CSV import): every
 * field the caller did not send at all takes the workspace default. An explicit value,
 * including `null` / `false`, always wins.
 */
export function applyLinkDefaults(
  body: Record<string, unknown>,
  defaults: LinkDefaults,
): Record<string, unknown> {
  const out = { ...body };
  if (out.openMode === undefined) {
    out.openMode = defaults.openMode;
  }
  if (out.noIndex === undefined) {
    out.noIndex = defaults.noIndex;
  }
  if (out.forwardQuery === undefined) {
    out.forwardQuery = defaults.forwardQuery;
  }
  if (out.folderId === undefined && defaults.folderId) {
    out.folderId = defaults.folderId;
  }
  if (out.utm === undefined && defaults.utm) {
    out.utm = defaults.utm;
  }
  return out;
}
