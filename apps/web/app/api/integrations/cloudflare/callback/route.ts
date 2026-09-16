import { NextResponse, type NextRequest } from "next/server";
import { recordAudit } from "@/lib/audit";
import {
  clearOauthStateCookie,
  decodeOauthState,
  exchangeOauthCode,
  readOauthStateCookie,
} from "@/lib/cloudflare-oauth";
import { connectCustomerCloudflare } from "@/lib/customer-cloudflare";
import { getSessionContext, hasWorkspaceRole } from "@/lib/session";

function finishHtml(ok: boolean, origin: string, error?: string, domainId?: string | null): string {
  const payload = JSON.stringify({ type: "short-cf-oauth", ok, error: error ?? null });
  const reason = !ok && error ? `&reason=${encodeURIComponent(error)}` : "";
  const next = domainId
    ? `/domains/${encodeURIComponent(domainId)}?cf=${ok ? "connected" : "error"}${reason}`
    : `/domains?cf=${ok ? "connected" : "error"}${reason}`;
  return `<!doctype html>
<meta charset="utf-8">
<title>Cloudflare</title>
<script>
  (function () {
    var payload = ${payload};
    var origin = ${JSON.stringify(origin)};
    if (window.opener) {
      window.opener.postMessage(payload, origin);
      window.close();
      return;
    }
    location.replace(${JSON.stringify(next)});
  })();
</script>`;
}

function htmlResponse(
  request: NextRequest,
  ok: boolean,
  error?: string,
  domainId?: string | null,
): NextResponse {
  const origin = new URL(request.url).origin;
  const response = new NextResponse(finishHtml(ok, origin, error, domainId), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  response.headers.append("Set-Cookie", clearOauthStateCookie());
  return response;
}

export async function GET(request: NextRequest) {
  const denied = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const returnedState = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  const cookieState = readOauthStateCookie(request.headers.get("cookie"));

  const cookieDecoded = cookieState ? decodeOauthState(cookieState) : null;
  const returnedDecoded = returnedState ? decodeOauthState(returnedState) : null;
  const domainId = cookieDecoded?.domainId ?? returnedDecoded?.domainId ?? null;

  if (denied) {
    return htmlResponse(request, false, "cf_oauth_denied", domainId);
  }
  if (!code || !returnedState || !cookieState || returnedState !== cookieState) {
    return htmlResponse(request, false, "cf_oauth_failed", domainId);
  }

  const state = cookieDecoded;
  if (!state) {
    return htmlResponse(request, false, "cf_oauth_failed", domainId);
  }

  const context = await getSessionContext();
  if (
    !context?.workspace ||
    context.workspace.id !== state.workspaceId ||
    (!hasWorkspaceRole(context.role ?? "member", "admin") && !context.isSuperadmin)
  ) {
    return htmlResponse(request, false, "cf_oauth_failed", state.domainId);
  }

  try {
    const tokens = await exchangeOauthCode(code, state.origin);
    await connectCustomerCloudflare(state.workspaceId, tokens.accessToken);
    await recordAudit({
      workspaceId: state.workspaceId,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "domain.cloudflare.oauth.connect",
      targetType: "workspace",
      targetId: state.workspaceId,
    });
    return htmlResponse(request, true, undefined, state.domainId);
  } catch (error) {
    console.error("cloudflare oauth callback failed", error);
    return htmlResponse(request, false, "cf_oauth_failed", state.domainId);
  }
}

/** Kept so the registered redirect URI always matches APP_URL. */
export const dynamic = "force-dynamic";
