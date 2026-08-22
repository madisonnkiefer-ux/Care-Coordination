import { beforeEach, describe, expect, it, vi } from "vitest";

// The global setup mock (test/setup.ts) returns a cookies() stub with no
// real storage behind get/set/delete — fine for tests that only assert a
// server action *called* cookies(), but useless here, where the whole
// point is round-tripping a value through a real signed JWT. This local
// mock overrides it with an actual in-memory store.
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

// lib/session.ts throws at module load if this isn't set — never exercised
// by other tests since they all mock @/lib/session wholesale instead of
// importing the real thing.
process.env.SESSION_SECRET ??= "test-only-secret-not-used-in-production";

describe("lib/session.ts: 90-day trusted-device MFA cookie", () => {
  beforeEach(() => {
    store.clear();
  });

  it("is untrusted with no cookie set at all", async () => {
    const { isDeviceTrustedForMfa } = await import("../session");
    expect(await isDeviceTrustedForMfa("user-a")).toBe(false);
  });

  it("round-trips: trusting a device makes isDeviceTrustedForMfa true for that same user", async () => {
    const { trustThisDeviceForMfa, isDeviceTrustedForMfa } = await import("../session");
    await trustThisDeviceForMfa("user-a");
    expect(await isDeviceTrustedForMfa("user-a")).toBe(true);
  });

  it("a device trusted for one user is not trusted for a different user", async () => {
    const { trustThisDeviceForMfa, isDeviceTrustedForMfa } = await import("../session");
    await trustThisDeviceForMfa("user-a");
    expect(await isDeviceTrustedForMfa("user-b")).toBe(false);
  });

  it("a malformed/tampered cookie value is treated as untrusted rather than throwing", async () => {
    const { isDeviceTrustedForMfa } = await import("../session");
    store.set("cch_mfa_trusted", "not-a-real-jwt");
    await expect(isDeviceTrustedForMfa("user-a")).resolves.toBe(false);
  });

  it("re-trusting the same device slides the window forward (a fresh token is written, not reused)", async () => {
    const { trustThisDeviceForMfa } = await import("../session");
    await trustThisDeviceForMfa("user-a");
    const first = store.get("cch_mfa_trusted");
    await new Promise((resolve) => setTimeout(resolve, 1100)); // JWT iat has 1s resolution
    await trustThisDeviceForMfa("user-a");
    const second = store.get("cch_mfa_trusted");
    expect(second).not.toBe(first);
  });
});
