// Constants safe to import from Client Components — lib/session.ts itself
// is server-only (it signs/verifies session JWTs), but the client-side idle
// warning needs the companion cookie's name to read it via document.cookie.
export const SESSION_EXPIRY_COOKIE_NAME = "cch_session_expiry";
