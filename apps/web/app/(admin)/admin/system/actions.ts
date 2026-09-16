"use server";

import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { eq, getDb, PLATFORM_SETTINGS_ID, platformSettings } from "@short/db";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { encryptSecret, decryptSecret } from "@/lib/secret";
import { requireSuperadmin } from "@/lib/session";
import {
  clearStripeCache,
  isStripePublishableKey,
  isStripeSecretKey,
  isStripeWebhookSecret,
} from "@/lib/stripe";

type StripeSaveInput = {
  secretKey: string;
  webhookSecret: string;
  publishableKey: string;
};

async function loadEncryptedRow() {
  const [row] = await getDb()
    .select({
      stripeSecretEnc: platformSettings.stripeSecretEnc,
      stripeWebhookSecretEnc: platformSettings.stripeWebhookSecretEnc,
      stripePublishableKey: platformSettings.stripePublishableKey,
    })
    .from(platformSettings)
    .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
    .limit(1);
  return row ?? null;
}

export async function saveStripeCredentialsAction(
  input: StripeSaveInput,
): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    const existing = await loadEncryptedRow();

    const secretKey = input.secretKey.trim() ||
      (existing?.stripeSecretEnc ? decryptSecret(existing.stripeSecretEnc) : "");
    const webhookSecret = input.webhookSecret.trim() ||
      (existing?.stripeWebhookSecretEnc ? decryptSecret(existing.stripeWebhookSecretEnc) : "");
    const publishableRaw = input.publishableKey.trim();
    const publishableKey = publishableRaw
      ? publishableRaw
      : (existing?.stripePublishableKey ?? null);

    if (!isStripeSecretKey(secretKey)) {
      return fail("stripe_invalid_secret");
    }
    if (!isStripeWebhookSecret(webhookSecret)) {
      return fail("stripe_invalid_webhook");
    }
    if (publishableKey && !isStripePublishableKey(publishableKey)) {
      return fail("stripe_invalid_publishable");
    }

    let livemode: boolean;
    try {
      const probe = new Stripe(secretKey, { typescript: true });
      const balance = await probe.balance.retrieve();
      livemode = balance.livemode;
    } catch {
      return fail("stripe_verify_failed");
    }

    const stripeSecretEnc = encryptSecret(secretKey);
    const stripeWebhookSecretEnc = encryptSecret(webhookSecret);

    await getDb()
      .insert(platformSettings)
      .values({
        id: PLATFORM_SETTINGS_ID,
        stripeSecretEnc,
        stripeWebhookSecretEnc,
        stripePublishableKey: publishableKey,
        stripeLivemode: livemode,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformSettings.id,
        set: {
          stripeSecretEnc,
          stripeWebhookSecretEnc,
          stripePublishableKey: publishableKey,
          stripeLivemode: livemode,
          updatedAt: new Date(),
        },
      });

    clearStripeCache();

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "admin.stripe.updated",
      targetType: "platform_settings",
      targetId: PLATFORM_SETTINGS_ID,
      metadata: {
        livemode,
        hasPublishable: Boolean(publishableKey),
        replacedSecret: input.secretKey.trim() !== "",
        replacedWebhook: input.webhookSecret.trim() !== "",
      },
    });

    revalidatePath("/admin/system");
    revalidatePath("/billing");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function clearStripeCredentialsAction(): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();

    await getDb()
      .update(platformSettings)
      .set({
        stripeSecretEnc: null,
        stripeWebhookSecretEnc: null,
        stripePublishableKey: null,
        stripeLivemode: null,
        updatedAt: new Date(),
      })
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID));

    clearStripeCache();

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "admin.stripe.cleared",
      targetType: "platform_settings",
      targetId: PLATFORM_SETTINGS_ID,
    });

    revalidatePath("/admin/system");
    revalidatePath("/billing");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}
