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

// Security headers, applied to every response. CSP uses the Next.js-
// documented nonce + 'strict-dynamic' pattern (nextjs.org/docs/app/guides/
// content-security-policy) so its own hydration/chunk-loading scripts keep
// working without 'unsafe-inline'. style-src needs 'unsafe-inline' because
// components/goal-donut.tsx sets a computed inline `style` attribute; every
// other directive stays same-origin-only since the app has no external
// scripts, fonts (next/font self-hosts at build time), images, or API calls.
function securityHeaders(nonce: string) {
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self';
    font-src 'self';
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    "Content-Security-Policy": csp,
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

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

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const headers = securityHeaders(nonce);
  const applyHeaders = (response: NextResponse) => {
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  };

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
    return applyHeaders(response);
  }

  if (isPublicRoute && session) {
    return applyHeaders(NextResponse.redirect(new URL("/", request.url)));
  }

  // MFA enforcement for every role: all accounts here can reach full member
  // PHI (charts, intake, care plans, home visits), not just Admin/Supervisor,
  // so a password alone isn't enough for anyone. /account stays reachable so
  // there's always a way to actually enroll.
  const needsMfaEnrollment = session && !session.mfaEnabled && !pathname.startsWith("/account");
  if (needsMfaEnrollment) {
    return applyHeaders(NextResponse.redirect(new URL("/account?mfaRequired=1", request.url)));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", headers["Content-Security-Policy"]);

  const response = applyHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
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
