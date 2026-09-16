"use server";

import { eq, getDb, user } from "@short/db";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { getAllowedVerifyEmail, writeVerifyGrant } from "@/lib/verify-grant";
import { consumeResendSlot, normalizeEmail } from "@/lib/verify-resend";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type ResendVerificationResult = {
  ok: boolean;
  remainingSeconds: number;
};

function clientIp(headerList: Headers): string {
  return (
    headerList.get("cf-connecting-ip") ??
    headerList.get("x-real-ip") ??
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function isUnverifiedAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { status?: number; body?: { code?: string }; message?: string };
  if (record.status === 403) {
    return true;
  }
  const code = (record.body?.code ?? "").toUpperCase();
  if (code.includes("VERIF")) {
    return true;
  }
  return (record.message ?? "").toLowerCase().includes("verif");
}

/**
 * Proves the caller just signed up or typed the password. The query string alone
 * is not enough to send mail.
 */
export async function grantVerifyResend(email: string, password: string): Promise<void> {
  try {
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      return;
    }

    const headerList = await headers();
    const ipLimit = await rateLimit(`verify-grant:${clientIp(headerList)}`, 20, 3600);
    if (!ipLimit.allowed) {
      return;
    }

    const normalized = normalizeEmail(parsed.data.email);
    const [row] = await getDb()
      .select({ emailVerified: user.emailVerified, banned: user.banned })
      .from(user)
      .where(eq(user.email, normalized))
      .limit(1);

    if (!row || row.banned || row.emailVerified) {
      return;
    }

    try {
      await auth.api.signInEmail({
        headers: headerList,
        body: { email: normalized, password: parsed.data.password },
      });
    } catch (error) {
      if (isUnverifiedAuthError(error)) {
        await writeVerifyGrant(normalized);
      }
    }
  } catch (error) {
    console.error("grantVerifyResend failed", error);
  }
}

/**
 * Sends only when a grant cookie or an unverified session exists.
 * Email comes from the grant cookie or an unverified session — never from the URL.
 */
export async function resendVerificationEmail(): Promise<ResendVerificationResult> {
  try {
    const email = await getAllowedVerifyEmail();
    if (!email) {
      return { ok: true, remainingSeconds: 0 };
    }

    const headerList = await headers();
    const gate = await consumeResendSlot(email, clientIp(headerList));
    if (!gate.allowed) {
      return { ok: false, remainingSeconds: gate.remainingSeconds };
    }

    try {
      await auth.api.sendVerificationEmail({
        headers: headerList,
        body: { email, callbackURL: "/dashboard" },
      });
    } catch (error) {
      console.error("sendVerificationEmail failed", error);
    }

    return { ok: true, remainingSeconds: gate.remainingSeconds };
  } catch (error) {
    console.error("resendVerificationEmail failed", error);
    return { ok: true, remainingSeconds: 0 };
  }
}

const changeSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

/**
 * Grant-gated address change for an unverified account. Existence-blind: the
 * caller always gets the same shape whether the new inbox is free or already taken.
 */
export async function changeUnverifiedEmailAction(
  email: string,
  password: string,
): Promise<ResendVerificationResult> {
  try {
    const current = await getAllowedVerifyEmail();
    if (!current) {
      return { ok: true, remainingSeconds: 0 };
    }

    const parsed = changeSchema.safeParse({ email, password });
    if (!parsed.success) {
      return { ok: true, remainingSeconds: 0 };
    }

    const headerList = await headers();
    const ipLimit = await rateLimit(`verify-change:${clientIp(headerList)}`, 10, 3600);
    if (!ipLimit.allowed) {
      const wait = Math.max(1, Math.ceil((ipLimit.resetAt - Date.now()) / 1000));
      return { ok: false, remainingSeconds: wait };
    }

    const nextEmail = normalizeEmail(parsed.data.email);
    const db = getDb();
    const [row] = await db
      .select({ id: user.id, emailVerified: user.emailVerified, banned: user.banned })
      .from(user)
      .where(eq(user.email, current))
      .limit(1);

    if (!row || row.banned || row.emailVerified) {
      return { ok: true, remainingSeconds: 0 };
    }

    try {
      await auth.api.signInEmail({
        headers: headerList,
        body: { email: current, password: parsed.data.password },
      });
    } catch (error) {
      if (!isUnverifiedAuthError(error)) {
        return { ok: true, remainingSeconds: 0 };
      }
    }

    if (nextEmail !== current) {
      const [taken] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, nextEmail))
        .limit(1);
      if (taken && taken.id !== row.id) {
        return { ok: true, remainingSeconds: 0 };
      }

      await db
        .update(user)
        .set({ email: nextEmail, updatedAt: new Date() })
        .where(eq(user.id, row.id));
    }

    await writeVerifyGrant(nextEmail);

    const gate = await consumeResendSlot(nextEmail, clientIp(headerList));
    if (!gate.allowed) {
      return { ok: false, remainingSeconds: gate.remainingSeconds };
    }

    try {
      await auth.api.sendVerificationEmail({
        headers: headerList,
        body: { email: nextEmail, callbackURL: "/dashboard" },
      });
    } catch (error) {
      console.error("changeUnverifiedEmail send failed", error);
    }

    return { ok: true, remainingSeconds: gate.remainingSeconds };
  } catch (error) {
    console.error("changeUnverifiedEmailAction failed", error);
    return { ok: true, remainingSeconds: 0 };
  }
}
