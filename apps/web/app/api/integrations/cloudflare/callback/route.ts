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

/**
 * Hands the result back to the panel tab. `postMessage` to the opener is the normal path,
 * but Cloudflare's consent page can sever `window.opener` (COOP), so the result also goes
 * out on a same-origin BroadcastChannel. Only when the popup cannot close itself does it
 * fall back to loading the domain page, which finishes the job on its own.
 */
function finishHtml(
  ok: boolean,
  origin: string,
  error?: string,
  domainId?: string | null,
  popup = true,
): string {
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
    var next = ${JSON.stringify(next)};
    var sent = false;
    if (window.opener) {
      try {
        window.opener.postMessage(payload, origin);
        sent = true;
      } catch (e) {}
    }
    if (${popup ? "true" : "false"} && typeof BroadcastChannel !== "undefined") {
      try {
        var channel = new BroadcastChannel("short-cf-oauth");
        channel.postMessage(payload);
        channel.close();
        sent = true;
      } catch (e) {}
    }
    if (sent) {
      window.close();
      setTimeout(function () {
        location.replace(next);
      }, 600);
      return;
    }
    location.replace(next);
  })();
</script>`;
}

function htmlResponse(
  request: NextRequest,
  ok: boolean,
  error?: string,
  domainId?: string | null,
  popup = true,
): NextResponse {
  const origin = new URL(request.url).origin;
  const response = new NextResponse(finishHtml(ok, origin, error, domainId, popup), {
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
  // Full-page flows (popup blocked) must not broadcast and try to close the only tab.
  const popup = cookieDecoded?.popup ?? returnedDecoded?.popup ?? true;

  if (denied) {
    return htmlResponse(request, false, "cf_oauth_denied", domainId, popup);
  }
  if (!code || !returnedState || !cookieState || returnedState !== cookieState) {
    return htmlResponse(request, false, "cf_oauth_failed", domainId, popup);
  }

  const state = cookieDecoded;
  if (!state) {
    return htmlResponse(request, false, "cf_oauth_failed", domainId, popup);
  }

  const context = await getSessionContext();
  if (
    !context?.workspace ||
    context.workspace.id !== state.workspaceId ||
    (!hasWorkspaceRole(context.role ?? "member", "admin") && !context.isSuperadmin)
  ) {
    return htmlResponse(request, false, "cf_oauth_failed", state.domainId, state.popup);
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
    return htmlResponse(request, true, undefined, state.domainId, state.popup);
  } catch (error) {
    console.error("cloudflare oauth callback failed", error);
    return htmlResponse(request, false, "cf_oauth_failed", state.domainId, state.popup);
  }
}

/** Kept so the registered redirect URI always matches APP_URL. */
export const dynamic = "force-dynamic";
