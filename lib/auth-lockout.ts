import "server-only";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

// Brute-force protection, shared between password/office-code failures
// (app/actions/auth.ts) and MFA-code failures (app/actions/mfa.ts) so a
// stolen password can't be paired with unlimited second-factor guesses.
// Time-based (no admin unlock step) and always surfaces the same generic
// error as a wrong password — telling a caller "this account is locked"
// would confirm the email exists.
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_MINUTES = 15;
export const GENERIC_LOGIN_ERROR = "Invalid email, password, or office code.";

export function isLockedOut(user: { lockedUntil: Date | null }) {
  return !!user.lockedUntil && user.lockedUntil > new Date();
}

export async function recordLoginFailure(
  user: { id: string; failedLoginAttempts: number; lockedUntil: Date | null },
  reason: string,
  context: { email?: string; ipAddress?: string }
) {
  // A lockout that has already expired starts this attempt's count fresh
  // instead of continuing to build on the stale pre-lockout count.
  const attempts = (user.lockedUntil ? 0 : user.failedLoginAttempts) + 1;
  const lockingOut = attempts >= LOCKOUT_THRESHOLD;
  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: lockingOut ? 0 : attempts,
      lockedUntil: lockingOut ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
    },
  });
  await writeAuditLog({
    userId: user.id,
    action: "LOGIN_FAILED",
    resource: "User",
    resourceId: user.id,
    metadata: { ...context, reason, lockedOut: lockingOut },
  });
}

export async function recordLoginSuccess(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
  });
}
