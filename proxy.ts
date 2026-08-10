import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  decrypt,
  encrypt,
  isWithinAbsoluteLifetime,
  sessionCookieOptions,
  expiryCookieOptions,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_COOKIE_NAME,
  IDLE_TIMEOUT_MINUTES,
} from "@/lib/session";

const PUBLIC_ROUTES = ["/login"];

// Optimistic, cookie-only check that runs on every request. This is the
// first line of defense (fast redirects, no DB hit) — every page/action/
// route handler still re-verifies via lib/dal.ts's verifySession(), since
// Proxy coverage can silently regress if a route is refactored.
//
// It also implements the HIPAA auto-logoff requirement: Proxy is the one
// place allowed to write response cookies on a normal page request, so the
// idle-timeout window is slid forward here on every authenticated request,
// capped by the session's absolute lifetime.
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = await decrypt(token);
  const session = payload && isWithinAbsoluteLifetime(payload) ? payload : null;

  if (!isPublicRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete(SESSION_COOKIE_NAME);
      response.cookies.delete(SESSION_EXPIRY_COOKIE_NAME);
    }
    return response;
  }

  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
  if (session) {
    const refreshed = await encrypt(session);
    response.cookies.set(SESSION_COOKIE_NAME, refreshed, sessionCookieOptions);
    // Client-readable mirror of the same idle-timeout window, so the
    // browser can warn the user before this slides out of validity.
    response.cookies.set(
      SESSION_EXPIRY_COOKIE_NAME,
      String(Date.now() + IDLE_TIMEOUT_MINUTES * 60 * 1000),
      expiryCookieOptions
    );
  }
  return response;
}

export const config = {
  // Static files in public/ (e.g. avanza-logo.png) are served at the root
  // path, not under a shared prefix — favicon.ico was the only one
  // excluded, so any other public/ asset fell through to the auth check
  // and got redirected when unauthenticated. Exclude by file extension
  // instead, the standard Next.js pattern for this matcher.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|css|js|woff2?|ttf|map)$).*)"],
};
