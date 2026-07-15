import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  decrypt,
  encrypt,
  isWithinAbsoluteLifetime,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
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
    if (token) response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
  if (session) {
    const refreshed = await encrypt(session);
    response.cookies.set(SESSION_COOKIE_NAME, refreshed, sessionCookieOptions);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
