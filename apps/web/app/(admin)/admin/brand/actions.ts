"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  eq,
  getDb,
  PLATFORM_ASSET_KINDS,
  PLATFORM_SETTINGS_ID,
  platformAssets,
  platformSettings,
  type PlatformAssetKind,
} from "@short/db";
import { fromZodError, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { knockoutBrandPlate } from "@/lib/brand-image";
import { requireSuperadmin } from "@/lib/session";

const brandUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  tagline: z.string().trim().max(160).nullable(),
  defaultLocale: z.enum(["tr", "en"]),
  localeSwitcherEnabled: z.boolean(),
});

export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

const MAX_ASSET_BYTES = 512 * 1024;
const MAX_OG_BYTES = 1024 * 1024;

export async function updateBrandAction(values: BrandUpdateInput): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    const parsed = brandUpdateSchema.safeParse(values);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }
    const input = parsed.data;

    await getDb()
      .update(platformSettings)
      .set({
        name: input.name,
        tagline: input.tagline?.trim() === "" ? null : input.tagline,
        defaultLocale: input.defaultLocale,
        localeSwitcherEnabled: input.localeSwitcherEnabled,
        updatedAt: new Date(),
      })
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID));

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: "admin.brand.updated",
      targetType: "platform_settings",
      targetId: PLATFORM_SETTINGS_ID,
      metadata: {
        name: input.name,
        defaultLocale: input.defaultLocale,
        localeSwitcherEnabled: input.localeSwitcherEnabled,
      },
    });

    revalidatePath("/admin/brand");
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadBrandAssetAction(formData: FormData): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    const kindRaw = String(formData.get("kind") ?? "");
    if (!(PLATFORM_ASSET_KINDS as readonly string[]).includes(kindRaw)) {
      return { ok: false, error: "errorUnknownAsset" };
    }
    const kind = kindRaw as PlatformAssetKind;
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "errorChooseImage" };
    }

    const maxBytes = kind === "og" ? MAX_OG_BYTES : MAX_ASSET_BYTES;
    if (file.size > maxBytes) {
      return { ok: false, error: kind === "og" ? "errorFileTooLargeOg" : "errorFileTooLarge" };
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return { ok: false, error: "errorInvalidType" };
    }

    const raw = Buffer.from(await file.arrayBuffer());
    const cleaned = await knockoutBrandPlate(raw, file.type);
    const bytes = cleaned.bytes;
    const contentType = cleaned.contentType;
    await getDb()
      .insert(platformAssets)
      .values({
        kind,
        contentType,
        bytes,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformAssets.kind,
        set: {
          contentType,
          bytes,
          updatedAt: new Date(),
        },
      });

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: "admin.brand.asset_uploaded",
      targetType: "platform_asset",
      targetId: kind,
      metadata: { contentType, bytes: bytes.byteLength },
    });

    revalidatePath("/admin/brand");
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}
