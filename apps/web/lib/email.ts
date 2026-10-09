import { createHash } from "node:crypto";
import { features, serverEnv } from "./env";
import { readyRedis, redisKey } from "./redis";

const CF_API = "https://api.cloudflare.com/client/v4";

/** The Email Service only sends from the platform's own, onboarded domains. */
const SENDER_DOMAINS = ["short.ky", "kisa.ly"];

/** Cloudflare caps one message at 50 recipients and 5 MiB including attachments. */
const MAX_RECIPIENTS = 50;
const MAX_MESSAGE_BYTES = 5 * 1024 * 1024;

/**
 * The API has no idempotency key. A retried action (double click, a Better Auth retry,
 * a cron re-run) must not mail the same thing twice, so identical messages to the same
 * recipient are suppressed for this long.
 */
const DEDUPE_SECONDS = 10 * 60;

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

type Sender = { address: string; name?: string };

/** "Short <noreply@short.ky>" → { name, address }; a bare address works too. */
export function parseSender(value: string): Sender | null {
  const match = /^\s*(?:"?([^"<]*?)"?\s*)?<\s*([^>\s]+@[^>\s]+)\s*>\s*$/.exec(value);
  const address = (match ? match[2] : value.trim()).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return null;
  }
  const domain = address.split("@")[1] ?? "";
  if (!SENDER_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))) {
    return null;
  }
  const name = match?.[1]?.trim();
  return name ? { address, name } : { address };
}

/** Rough wire size: the JSON body is what Cloudflare measures against the 5 MiB cap. */
function tooLarge(body: string): boolean {
  return Buffer.byteLength(body, "utf8") > MAX_MESSAGE_BYTES;
}

function dedupeKey(payload: EmailPayload): string {
  const digest = createHash("sha256")
    .update(`${payload.to.toLowerCase()}\n${payload.subject}\n${payload.html}`)
    .digest("hex");
  return redisKey(`email-sent:${digest}`);
}

/** Claims the message; false when this exact message was handed over recently. */
async function claimSend(key: string): Promise<boolean> {
  const redis = await readyRedis();
  if (!redis) {
    return true;
  }
  try {
    return (await redis.set(key, "1", "EX", DEDUPE_SECONDS, "NX")) !== null;
  } catch {
    // Without Redis we cannot dedupe; sending once more beats losing a reset link.
    return true;
  }
}

/** A failed send must not block the user's own retry. */
async function releaseSend(key: string): Promise<void> {
  const redis = await readyRedis();
  await redis?.del(key).catch(() => undefined);
}

/**
 * Sends transactional mail (sign-up, password reset, invites, alerts, digests) through
 * Cloudflare Email Service. Never use it for bulk or marketing mail: complaints and
 * bounces suspend sending for every domain on the account. Without a token the message
 * is logged in development so sign-up links stay visible.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!features().email) {
    if (process.env.NODE_ENV === "production") {
      // Bodies carry reset and verification tokens; they must never land in production logs.
      console.error(`[email] CF_EMAIL_TOKEN is not configured; dropped "${payload.subject}"`);
      return;
    }
    console.info(`[email:dev] to=${payload.to} subject=${payload.subject}\n${payload.text ?? payload.html}`);
    return;
  }

  const env = serverEnv();
  const from = parseSender(env.EMAIL_FROM);
  if (!from) {
    console.error(`[email] EMAIL_FROM must be an address on ${SENDER_DOMAINS.join(" or ")}; dropped "${payload.subject}"`);
    return;
  }
  const recipients = payload.to.split(",").map((value) => value.trim()).filter(Boolean);
  if (recipients.length === 0 || recipients.length > MAX_RECIPIENTS) {
    console.error(`[email] ${recipients.length} recipients (1–${MAX_RECIPIENTS} allowed); dropped "${payload.subject}"`);
    return;
  }

  // Replies reach a person: support@ on the sending domain unless configured otherwise.
  const replyTo = payload.replyTo ?? env.EMAIL_REPLY_TO ?? `support@${from.address.split("@")[1]}`;
  const body = JSON.stringify({
    from,
    to: recipients.length === 1 ? recipients[0] : recipients,
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: payload.subject,
    html: payload.html,
    ...(payload.text ? { text: payload.text } : {}),
  });
  if (tooLarge(body)) {
    console.error(`[email] message over 5 MiB; dropped "${payload.subject}"`);
    return;
  }
  const key = dedupeKey(payload);
  if (!(await claimSend(key))) {
    console.info(`[email] duplicate within ${DEDUPE_SECONDS}s suppressed: "${payload.subject}"`);
    return;
  }

  try {
    const response = await fetch(`${CF_API}/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.CF_EMAIL_TOKEN}`, "content-type": "application/json" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json().catch(() => null)) as {
      success?: boolean;
      errors?: { message?: string }[];
      result?: { permanent_bounces?: unknown[]; suppressed_recipients?: unknown[] };
    } | null;
    if (!response.ok || !result?.success) {
      throw new Error(result?.errors?.[0]?.message ?? `HTTP ${response.status}`);
    }
    const bounced = result.result?.permanent_bounces?.length ?? 0;
    const suppressed = result.result?.suppressed_recipients?.length ?? 0;
    if (bounced || suppressed) {
      console.warn(`[email] "${payload.subject}": ${bounced} permanent bounce(s), ${suppressed} suppressed`);
    }
  } catch (error) {
    await releaseSend(key);
    // Mail delivery must not break sign-up; the user can request another link.
    console.error("sendEmail failed", error);
  }
}
