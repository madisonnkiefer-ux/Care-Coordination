import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbMock } from "../../../test/mocks/db";

const dbMock = createDbMock();
vi.mock("@/lib/db", () => ({ db: dbMock }));

const requirePermission = vi.fn();
const requireRole = vi.fn();
const verifySession = vi.fn();
vi.mock("@/lib/dal", () => ({ requirePermission, requireRole, verifySession }));

vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }));

const CLINIC_A = "clinic-a";
const NON_ADMIN_SESSION = { userId: "supervisor-a", clinicId: CLINIC_A, role: "SUPERVISOR" };
const ADMIN_SESSION = { userId: "admin-a", clinicId: CLINIC_A, role: "ADMIN" };

describe("users.ts: minting/promoting an Admin requires an actual Admin session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createUser rejects role=ADMIN from a MANAGE_USERS holder who isn't an Admin", async () => {
    requirePermission.mockResolvedValue(NON_ADMIN_SESSION);
    const { createUser } = await import("../users");

    const formData = new FormData();
    formData.set("name", "New Admin");
    formData.set("email", "new-admin@example.com");
    formData.set("password", "password123");
    formData.set("role", "ADMIN");

    const result = await createUser(undefined, formData);
    expect(result?.error).toMatch(/only an admin/i);
    expect((dbMock as any).user.create).not.toHaveBeenCalled();
  });

  it("createUser allows role=ADMIN for an actual Admin session", async () => {
    requirePermission.mockResolvedValue(ADMIN_SESSION);
    (dbMock as any).user.findUnique.mockResolvedValue(null);
    (dbMock as any).user.create.mockResolvedValue({ id: "new-user" });
    const { createUser } = await import("../users");

    const formData = new FormData();
    formData.set("name", "New Admin");
    formData.set("email", "new-admin@example.com");
    formData.set("password", "password123");
    formData.set("role", "ADMIN");

    await expect(createUser(undefined, formData)).rejects.toThrow(/NEXT_REDIRECT/);
    expect((dbMock as any).user.create).toHaveBeenCalled();
  });

  it("updateUserRole rejects promoting a user to ADMIN from a non-Admin session", async () => {
    requirePermission.mockResolvedValue(NON_ADMIN_SESSION);
    (dbMock as any).user.findUnique.mockResolvedValue({ id: "target", clinicId: CLINIC_A, role: "CARE_COORDINATOR" });
    const { updateUserRole } = await import("../users");

    const formData = new FormData();
    formData.set("role", "ADMIN");

    await expect(updateUserRole("target", formData)).rejects.toThrow(/only an admin/i);
    expect((dbMock as any).user.update).not.toHaveBeenCalled();
  });

  it("updateUserRole rejects a non-Admin changing an existing Admin's role", async () => {
    requirePermission.mockResolvedValue(NON_ADMIN_SESSION);
    (dbMock as any).user.findUnique.mockResolvedValue({ id: "target", clinicId: CLINIC_A, role: "ADMIN" });
    const { updateUserRole } = await import("../users");

    const formData = new FormData();
    formData.set("role", "SUPERVISOR");

    await expect(updateUserRole("target", formData)).rejects.toThrow(/only an admin/i);
    expect((dbMock as any).user.update).not.toHaveBeenCalled();
  });

  it("updateUserRole allows a non-Admin to change roles among non-Admin targets", async () => {
    requirePermission.mockResolvedValue(NON_ADMIN_SESSION);
    (dbMock as any).user.findUnique.mockResolvedValue({ id: "target", clinicId: CLINIC_A, role: "CARE_COORDINATOR" });
    const { updateUserRole } = await import("../users");

    const formData = new FormData();
    formData.set("role", "SUPERVISOR");

    await expect(updateUserRole("target", formData)).resolves.not.toThrow();
    expect((dbMock as any).user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "target" }, data: { role: "SUPERVISOR", customRoleId: null } })
    );
  });
});

describe("permissions.ts: assignCustomRole requires requireRole(ADMIN), not requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls requireRole('ADMIN') rather than requirePermission", async () => {
    requireRole.mockResolvedValue(ADMIN_SESSION);
    (dbMock as any).user.findUnique.mockResolvedValue({ id: "target", clinicId: CLINIC_A, role: "CARE_COORDINATOR" });
    const { assignCustomRole } = await import("../permissions");

    await assignCustomRole("target", null);

    expect(requireRole).toHaveBeenCalledWith("ADMIN");
    expect(requirePermission).not.toHaveBeenCalled();
  });
});

describe("member-assignment.ts / create-member.ts: coordinatorId must belong to the caller's clinic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reassignMember rejects a coordinatorId from a different clinic", async () => {
    requirePermission.mockResolvedValue({ ...NON_ADMIN_SESSION, userId: "supervisor-a" });
    (dbMock as any).member.findUnique.mockResolvedValue({
      id: "member-a",
      clinicId: CLINIC_A,
      assignedCoordinatorId: null,
      status: "PENDING_ENROLLMENT",
      firstName: "A",
      lastName: "B",
    });
    (dbMock as any).user.findUnique.mockResolvedValue({ id: "coordinator-x", clinicId: "clinic-b" });
    const { reassignMember } = await import("../member-assignment");

    const formData = new FormData();
    formData.set("coordinatorId", "coordinator-x");

    await expect(reassignMember("member-a", formData)).rejects.toThrow("Forbidden");
    expect((dbMock as any).member.update).not.toHaveBeenCalled();
  });

  it("createMember rejects an assignedCoordinatorId from a different clinic", async () => {
    verifySession.mockResolvedValue({ ...NON_ADMIN_SESSION, userId: "supervisor-a" });
    (dbMock as any).user.findUnique.mockResolvedValue({ id: "coordinator-x", clinicId: "clinic-b" });
    const { createMember } = await import("../create-member");

    const formData = new FormData();
    formData.set("firstName", "New");
    formData.set("lastName", "Member");
    formData.set("dateOfBirth", "1990-01-01");
    formData.set("assignedCoordinatorId", "coordinator-x");

    const result = await createMember(undefined, formData);
    expect(result?.error).toMatch(/valid care coordinator/i);
    expect((dbMock as any).member.create).not.toHaveBeenCalled();
  });
});
