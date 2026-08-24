import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression coverage for the release-acceptance-audit finding: a session
// cookie is a self-contained signed JWT, checked only for signature and
// expiry — nothing re-queries the database per request, so deactivating a
// user used to only block their *next* login. This proves the fix: a
// still-unexpired, still-correctly-signed session for a revoked user is
// rejected by getSessionPayload() itself, not just by the login path.
const store = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map()),
  cookies: vi.fn(async () => ({
    get: (name: string) => (store.has(name) ? { value: store.get(name) } : undefined),
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  })),
}));

process.env.SESSION_SECRET ??= "test-only-secret-not-used-in-production";

const BASE_USER = {
  id: "user-a",
  clinicId: "clinic-a",
  role: "CARE_COORDINATOR" as const,
  name: "Coordinator",
  email: "coordinator@example.com",
  permissions: [],
  mfaEnabled: true,
};

describe("lib/session.ts: getSessionPayload rejects a revoked user's still-valid session", () => {
  beforeEach(() => {
    store.clear();
  });

  it("a freshly-created session is valid", async () => {
    const { createSession, getSessionPayload } = await import("../session");
    await createSession(BASE_USER);
    const payload = await getSessionPayload();
    expect(payload?.userId).toBe(BASE_USER.id);
  });

  it("the same still-unexpired session is rejected once the user is revoked", async () => {
    const { createSession, getSessionPayload } = await import("../session");
    const { revokeUserSessions, unrevokeUserSessions } = await import("../session-revocation");
    unrevokeUserSessions(BASE_USER.id);

    await createSession(BASE_USER);
    expect((await getSessionPayload())?.userId).toBe(BASE_USER.id);

    revokeUserSessions(BASE_USER.id);
    expect(await getSessionPayload()).toBeNull();

    unrevokeUserSessions(BASE_USER.id);
  });

  it("revoking one user's session does not affect a different user's session", async () => {
    const { createSession, getSessionPayload } = await import("../session");
    const { revokeUserSessions, unrevokeUserSessions } = await import("../session-revocation");
    unrevokeUserSessions("some-other-user");

    revokeUserSessions("some-other-user");
    await createSession(BASE_USER);
    expect((await getSessionPayload())?.userId).toBe(BASE_USER.id);

    unrevokeUserSessions("some-other-user");
  });
});
