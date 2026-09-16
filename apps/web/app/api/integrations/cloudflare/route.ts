import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { recordAudit } from "@/lib/audit";
import {
  buildAuthorizeUrl,
  cloudflareOAuthEnabled,
  encodeOauthState,
  oauthStateCookie,
  requestOrigin,
} from "@/lib/cloudflare-oauth";
import { hasWorkspaceRole, getSessionContext } from "@/lib/session";

/**
 * Starts the Cloudflare consent popup. The browser stays on app.short.ky so the
 * session cookie is sent; the response 302s into dash.cloudflare.com.
 */
export async function GET(request: NextRequest) {
  if (!cloudflareOAuthEnabled()) {
    return NextResponse.json({ error: "oauth_disabled" }, { status: 501 });
  }

  const context = await getSessionContext();
  if (!context?.workspace || !context.role) {
    return NextResponse.redirect(new URL("/login?next=/domains", request.url));
  }
  if (!hasWorkspaceRole(context.role, "admin") && !context.isSuperadmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const popup = request.nextUrl.searchParams.get("popup") === "1";
  const domainId = request.nextUrl.searchParams.get("domainId")?.trim() || null;
  const origin = requestOrigin(request.url);
  const state = encodeOauthState({
    nonce: randomBytes(16).toString("hex"),
    workspaceId: context.workspace.id,
    domainId,
    popup,
    origin,
    exp: Date.now() + 10 * 60 * 1000,
  });

  await recordAudit({
    workspaceId: context.workspace.id,
    actorId: context.user.id,
    impersonatorId: context.impersonatedBy,
    action: "domain.cloudflare.oauth.start",
    targetType: "workspace",
    targetId: context.workspace.id,
  });

  const response = NextResponse.redirect(buildAuthorizeUrl(state, origin));
  response.headers.append("Set-Cookie", oauthStateCookie(state, undefined, origin));
  return response;
}
