import { beforeEach, describe, expect, it } from "vitest";
import { revokeUserSessions, unrevokeUserSessions, isUserSessionRevoked } from "../session-revocation";

describe("lib/session-revocation.ts", () => {
  const userId = "user-a";

  beforeEach(() => {
    unrevokeUserSessions(userId);
  });

  it("a user is not revoked by default", () => {
    expect(isUserSessionRevoked(userId)).toBe(false);
  });

  it("revokeUserSessions marks a user as revoked", () => {
    revokeUserSessions(userId);
    expect(isUserSessionRevoked(userId)).toBe(true);
  });

  it("unrevokeUserSessions clears a revocation (reactivation case)", () => {
    revokeUserSessions(userId);
    unrevokeUserSessions(userId);
    expect(isUserSessionRevoked(userId)).toBe(false);
  });

  it("revocation is scoped to the specific user, not global", () => {
    revokeUserSessions(userId);
    expect(isUserSessionRevoked("user-b")).toBe(false);
  });
});
