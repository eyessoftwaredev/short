import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "./env";

const STATE_COOKIE = "cf_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;
const AUTH_URL = "https://dash.cloudflare.com/oauth2/auth";
const TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";
/** Zone list + DNS write — names match Cloudflare OAuth scope ids. */
const SCOPES = ["account-settings.read", "zone.read", "dns.write"] as const;

export type OauthState = {
  nonce: string;
  workspaceId: string;
  domainId: string | null;
  popup: boolean;
  /** Origin the popup opened from, so the token exchange redirect_uri matches. */
  origin: string;
  exp: number;
};

export function cloudflareOAuthEnabled(): boolean {
  const env = serverEnv();
  return Boolean(env.CF_OAUTH_CLIENT_ID && env.CF_OAUTH_CLIENT_SECRET);
}

export function requestOrigin(requestUrl: string): string {
  return new URL(requestUrl).origin;
}

export function cloudflareOAuthCallbackUrl(origin?: string): string {
  const base = (origin ?? serverEnv().APP_URL).replace(/\/$/, "");
  return `${base}/api/integrations/cloudflare/callback`;
}

function sign(payload: string): string {
  return createHmac("sha256", serverEnv().BETTER_AUTH_SECRET).update(payload).digest("base64url");
}

export function encodeOauthState(state: OauthState): string {
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeOauthState(value: string): OauthState | null {
  const dot = value.lastIndexOf(".");
  if (dot < 1) {
    return null;
  }
  const payload = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  const expected = sign(payload);
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OauthState;
    if (!parsed.nonce || !parsed.workspaceId || !parsed.origin || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function oauthStateCookie(value: string, maxAgeSec = STATE_TTL_MS / 1000, origin?: string): string {
  const secure = (origin ?? serverEnv().APP_URL).startsWith("https://") ? "; Secure" : "";
  return `${STATE_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function clearOauthStateCookie(): string {
  return oauthStateCookie("", 0);
}

export function readOauthStateCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === STATE_COOKIE) {
      return rest.join("=") || null;
    }
  }
  return null;
}

export function buildAuthorizeUrl(state: string, origin: string): string {
  const env = serverEnv();
  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.CF_OAUTH_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", cloudflareOAuthCallbackUrl(origin));
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export type OauthTokenResult = {
  accessToken: string;
};

export async function exchangeOauthCode(code: string, origin: string): Promise<OauthTokenResult> {
  const env = serverEnv();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: cloudflareOAuthCallbackUrl(origin),
    client_id: env.CF_OAUTH_CLIENT_ID ?? "",
    client_secret: env.CF_OAUTH_CLIENT_SECRET ?? "",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
    signal: AbortSignal.timeout(12_000),
  });

  const json = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Cloudflare OAuth exchange failed.");
  }

  return { accessToken: json.access_token };
}

export { STATE_TTL_MS };
