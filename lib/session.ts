import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/app/generated/prisma/client";
import { SESSION_EXPIRY_COOKIE_NAME } from "@/lib/session-shared";

export { SESSION_EXPIRY_COOKIE_NAME } from "@/lib/session-shared";

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("SESSION_SECRET environment variable is not set");
}
const encodedKey = new TextEncoder().encode(secretKey);

export const SESSION_COOKIE_NAME = "cch_session";

// HIPAA technical safeguard: automatic logoff. Idle sessions expire quickly;
// even an actively-used session is capped so a forgotten, unlocked device
// doesn't stay authenticated indefinitely.
export const IDLE_TIMEOUT_MINUTES = 15;
export const ABSOLUTE_TIMEOUT_HOURS = 8;

export type SessionPayload = {
  userId: string;
  clinicId: string;
  role: Role;
  name: string;
  email: string;
  issuedAt: number; // ms epoch, absolute session start
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${IDLE_TIMEOUT_MINUTES}m`)
    .sign(encodedKey);
}

export async function decrypt(token: string | undefined = ""): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(user: {
  id: string;
  clinicId: string;
  role: Role;
  name: string;
  email: string;
}) {
  const payload: SessionPayload = {
    userId: user.id,
    clinicId: user.clinicId,
    role: user.role,
    name: user.name,
    email: user.email,
    issuedAt: Date.now(),
  };
  const session = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session, sessionCookieOptions);
  cookieStore.set(SESSION_EXPIRY_COOKIE_NAME, String(Date.now() + IDLE_TIMEOUT_MINUTES * 60 * 1000), expiryCookieOptions);
}

export function isWithinAbsoluteLifetime(payload: SessionPayload) {
  const absoluteExpiry = payload.issuedAt + ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000;
  return Date.now() <= absoluteExpiry;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(SESSION_EXPIRY_COOKIE_NAME);
}

// Read-only: safe to call from Server Components, which (per Next.js) may
// only read cookies, never write them. Sliding the idle-timeout window
// forward happens in proxy.ts instead, where writing response cookies is
// allowed.
export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await decrypt(token);
  if (!payload || !isWithinAbsoluteLifetime(payload)) return null;
  return payload;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: IDLE_TIMEOUT_MINUTES * 60,
};

// Same lifetime/security posture as the session cookie, just readable by
// client JS (httpOnly: false) since its whole purpose is to let the
// browser show a countdown before the real, httpOnly session expires.
export const expiryCookieOptions = {
  ...sessionCookieOptions,
  httpOnly: false,
};
