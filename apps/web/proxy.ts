import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only. This runs on the edge and cannot reach Postgres, so it just
 * checks for a session cookie; `requireSession()` in the server components performs the
 * authoritative check and the role authorization.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/links",
  "/qr",
  "/bio",
  "/analytics",
  "/domains",
  "/settings",
  "/billing",
  "/admin",
  "/onboarding",
  "/docs",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Auth screens decide for themselves after `getSession()`. A leftover cookie
  // must not bounce /login → /dashboard → /login when Postgres rejects it.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/links/:path*",
    "/qr/:path*",
    "/bio/:path*",
    "/analytics/:path*",
    "/domains/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/admin/:path*",
    "/docs/:path*",
    "/onboarding",
    "/login",
    "/register",
    "/verify",
    "/forgot",
    "/reset",
    "/invite/:path*",
  ],
};
