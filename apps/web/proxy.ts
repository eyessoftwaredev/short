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
];

const AUTH_ROUTES = ["/login", "/register", "/forgot", "/reset"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

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
    "/onboarding",
    "/login",
    "/register",
    "/forgot",
    "/reset",
    "/invite/:path*",
  ],
};
