import "server-only";

// In-memory immediate-revocation list. Session cookies are self-contained
// signed JWTs (lib/session.ts) checked only for a valid signature and
// unexpired lifetime — nothing re-queries the database per request to
// confirm the underlying account is still active, so deactivating a user
// in Settings would otherwise only block their *next* login: an
// already-issued session cookie keeps working until its own idle/absolute
// expiry (up to 8 hours). This closes that gap without adding a database
// round trip to every authenticated request.
//
// Safe as in-process state for the same reason lib/rate-limit.ts is: this
// app runs as a single ECS task with no autoscaling (infra/ecs.tf's
// app_desired_count is pinned to 1). If that ever changes, this needs to
// move to a shared store (Redis/Upstash) — each task would otherwise keep
// an independent list, and a session revoked on one task would keep working
// on another. A residual gap even on a single task: this list resets on
// deploy/restart, so a user deactivated before a restart regains access
// (via their still-unexpired cookie) until it naturally expires — accepted
// as a rare edge case, not routine like the per-request problem this fixes.
const revokedUserIds = new Set<string>();

export function revokeUserSessions(userId: string) {
  revokedUserIds.add(userId);
}

export function unrevokeUserSessions(userId: string) {
  revokedUserIds.delete(userId);
}

export function isUserSessionRevoked(userId: string): boolean {
  return revokedUserIds.has(userId);
}
