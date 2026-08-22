import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbMock } from "../../../test/mocks/db";

// Regression coverage for a gap the release-acceptance audit flagged: the
// session's `mfaEnabled` flag is what proxy.ts's MFA-enforcement redirect
// and the 7 MFA-gated API routes rely on, and it's set at session-mint time
// from three different call sites. A bug in any of them (e.g. spreading the
// wrong object, or minting before the DB write lands) would silently let a
// non-MFA session through a gate that assumes MFA, or vice versa — nothing
// else in the suite exercises these three paths end-to-end.

const dbMock = createDbMock();
vi.mock("@/lib/db", () => ({ db: dbMock }));

const createSession = vi.fn();
const deleteSession = vi.fn();
const createMfaPendingCookie = vi.fn();
const readMfaPendingUserId = vi.fn();
const clearMfaPendingCookie = vi.fn();
const isDeviceTrustedForMfa = vi.fn();
const trustThisDeviceForMfa = vi.fn();
vi.mock("@/lib/session", () => ({
  createSession,
  deleteSession,
  createMfaPendingCookie,
  readMfaPendingUserId,
  clearMfaPendingCookie,
  isDeviceTrustedForMfa,
  trustThisDeviceForMfa,
}));

const getSession = vi.fn();
const verifySession = vi.fn();
vi.mock("@/lib/dal", () => ({ getSession, verifySession }));

vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));

const isLockedOut = vi.fn(() => false);
const recordLoginFailure = vi.fn();
const recordLoginSuccess = vi.fn();
vi.mock("@/lib/auth-lockout", () => ({
  isLockedOut,
  recordLoginFailure,
  recordLoginSuccess,
  GENERIC_LOGIN_ERROR: "Invalid email, password, or office code.",
}));

const verifyTotpCode = vi.fn();
const consumeBackupCode = vi.fn();
const generateTotpSecret = vi.fn(() => ({ secretBase32: "SECRETSECRETSECRETSECRETSECRETSE" }));
const generateBackupCodes = vi.fn(() => ["AAAA-1111", "BBBB-2222"]);
const hashBackupCodes = vi.fn(async () => ["hash1", "hash2"]);
vi.mock("@/lib/mfa", () => ({ verifyTotpCode, consumeBackupCode, generateTotpSecret, generateBackupCodes, hashBackupCodes }));

const resolveUserPermissions = vi.fn(async () => []);
vi.mock("@/lib/data/permissions", () => ({ resolveUserPermissions }));

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(() => true) }));

vi.mock("bcryptjs", () => ({ default: { compare: vi.fn(async () => true) } }));

const BASE_USER = {
  id: "user-a",
  email: "coordinator@demo.local",
  active: true,
  passwordHash: "hash",
  lockedUntil: null,
  failedLoginAttempts: 0,
  mfaEnabled: true,
  mfaSecret: "SECRETSECRETSECRETSECRETSECRETSE",
  mfaBackupCodeHashes: [],
  clinicId: "clinic-a",
  clinic: { code: "DEMO1" },
  role: "CARE_COORDINATOR",
  name: "Coordinator",
};

describe("app/actions/auth.ts: mfaEnabled propagation into createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLockedOut.mockReturnValue(false);
    resolveUserPermissions.mockResolvedValue([]);
  });

  it("login()'s trusted-device fast path mints a session with mfaEnabled: true", async () => {
    (dbMock as any).user.findUnique.mockResolvedValue({ ...BASE_USER });
    isDeviceTrustedForMfa.mockResolvedValue(true);
    const { login } = await import("../auth");

    const formData = new FormData();
    formData.set("email", BASE_USER.email);
    formData.set("password", "whatever");
    formData.set("officeCode", "demo1");

    await expect(login(undefined, formData)).rejects.toThrow(/NEXT_REDIRECT:\/$/);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ mfaEnabled: true }));
  });

  it("login() defers to the MFA code prompt — no session minted — when the device isn't trusted", async () => {
    (dbMock as any).user.findUnique.mockResolvedValue({ ...BASE_USER });
    isDeviceTrustedForMfa.mockResolvedValue(false);
    const { login } = await import("../auth");

    const formData = new FormData();
    formData.set("email", BASE_USER.email);
    formData.set("password", "whatever");
    formData.set("officeCode", "demo1");

    const result = await login(undefined, formData);
    expect(result).toEqual({ mfaRequired: true });
    expect(createMfaPendingCookie).toHaveBeenCalledWith(BASE_USER.id);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("login() mints a session with mfaEnabled: false for an account that never enrolled", async () => {
    (dbMock as any).user.findUnique.mockResolvedValue({ ...BASE_USER, mfaEnabled: false, mfaSecret: null });
    const { login } = await import("../auth");

    const formData = new FormData();
    formData.set("email", BASE_USER.email);
    formData.set("password", "whatever");
    formData.set("officeCode", "demo1");

    await expect(login(undefined, formData)).rejects.toThrow(/NEXT_REDIRECT:\/$/);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ mfaEnabled: false }));
  });

  it("verifyMfaCode() mints a session with mfaEnabled: true and trusts the device after a valid TOTP code", async () => {
    readMfaPendingUserId.mockResolvedValue(BASE_USER.id);
    (dbMock as any).user.findUnique.mockResolvedValue({ ...BASE_USER });
    verifyTotpCode.mockReturnValue(true);
    const { verifyMfaCode } = await import("../auth");

    const formData = new FormData();
    formData.set("code", "123456");

    await expect(verifyMfaCode(undefined, formData)).rejects.toThrow(/NEXT_REDIRECT:\/$/);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ mfaEnabled: true }));
    expect(trustThisDeviceForMfa).toHaveBeenCalledWith(BASE_USER.id);
  });
});

describe("app/actions/mfa.ts: confirmMfaEnrollment re-issues the session with mfaEnabled: true", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mints a fresh session with mfaEnabled: true immediately, without waiting for next login", async () => {
    verifySession.mockResolvedValue({
      userId: "user-a",
      clinicId: "clinic-a",
      role: "CARE_COORDINATOR",
      name: "Coordinator",
      email: "coordinator@demo.local",
      permissions: [],
      mfaEnabled: false,
    });
    (dbMock as any).user.findUniqueOrThrow.mockResolvedValue({
      email: "coordinator@demo.local",
      mfaEnabled: false,
      mfaSecret: "SECRETSECRETSECRETSECRETSECRETSE",
    });
    verifyTotpCode.mockReturnValue(true);
    const { confirmMfaEnrollment } = await import("../mfa");

    const formData = new FormData();
    formData.set("code", "123456");

    const result = await confirmMfaEnrollment(undefined, formData);
    expect(result?.backupCodes).toEqual(["AAAA-1111", "BBBB-2222"]);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ mfaEnabled: true }));
    expect(trustThisDeviceForMfa).toHaveBeenCalledWith("user-a");
  });

  it("rejects an invalid code and never mints a session", async () => {
    verifySession.mockResolvedValue({
      userId: "user-a",
      clinicId: "clinic-a",
      role: "CARE_COORDINATOR",
      name: "Coordinator",
      email: "coordinator@demo.local",
      permissions: [],
      mfaEnabled: false,
    });
    (dbMock as any).user.findUniqueOrThrow.mockResolvedValue({
      email: "coordinator@demo.local",
      mfaEnabled: false,
      mfaSecret: "SECRETSECRETSECRETSECRETSECRETSE",
    });
    verifyTotpCode.mockReturnValue(false);
    const { confirmMfaEnrollment } = await import("../mfa");

    const formData = new FormData();
    formData.set("code", "000000");

    const result = await confirmMfaEnrollment(undefined, formData);
    expect(result?.error).toMatch(/invalid code/i);
    expect(createSession).not.toHaveBeenCalled();
  });
});
