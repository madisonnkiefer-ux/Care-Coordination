import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbMock } from "../../../test/mocks/db";

const dbMock = createDbMock();
vi.mock("@/lib/db", () => ({ db: dbMock }));

const requirePermission = vi.fn();
vi.mock("@/lib/dal", () => ({ requirePermission }));

vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }));

const SESSION = { userId: "supervisor-a", clinicId: "clinic-a" };
const OWN_MEMBER_ID = "member-a";

describe("member-status.ts tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue(SESSION);
  });

  it("approveStatusChange rejects a statusChangeId whose member is in a different clinic", async () => {
    const { approveStatusChange } = await import("../member-status");
    (dbMock as any).memberStatusChange.findUnique.mockResolvedValue({
      id: "change-x",
      memberId: OWN_MEMBER_ID,
      requiresApproval: true,
      approvedAt: null,
      rejectedAt: null,
      member: { id: OWN_MEMBER_ID, clinicId: "clinic-b" },
    });

    await expect(approveStatusChange(OWN_MEMBER_ID, "change-x")).rejects.toThrow("Not found");
    expect((dbMock as any).member.update).not.toHaveBeenCalled();
  });

  it("approveStatusChange rejects a statusChangeId whose memberId doesn't match the claimed member", async () => {
    const { approveStatusChange } = await import("../member-status");
    (dbMock as any).memberStatusChange.findUnique.mockResolvedValue({
      id: "change-x",
      memberId: "member-b",
      requiresApproval: true,
      approvedAt: null,
      rejectedAt: null,
      member: { id: "member-b", clinicId: SESSION.clinicId },
    });

    await expect(approveStatusChange(OWN_MEMBER_ID, "change-x")).rejects.toThrow("Not found");
    expect((dbMock as any).member.update).not.toHaveBeenCalled();
  });

  it("rejectStatusChange rejects a statusChangeId whose member is in a different clinic", async () => {
    const { rejectStatusChange } = await import("../member-status");
    (dbMock as any).memberStatusChange.findUnique.mockResolvedValue({
      id: "change-x",
      memberId: OWN_MEMBER_ID,
      requiresApproval: true,
      approvedAt: null,
      rejectedAt: null,
      member: { id: OWN_MEMBER_ID, clinicId: "clinic-b" },
    });

    await expect(rejectStatusChange(OWN_MEMBER_ID, "change-x", new FormData())).rejects.toThrow("Not found");
    expect((dbMock as any).memberStatusChange.update).not.toHaveBeenCalled();
  });

  it("approveStatusChange succeeds for a genuinely same-clinic, matching-member change", async () => {
    const { approveStatusChange } = await import("../member-status");
    (dbMock as any).memberStatusChange.findUnique.mockResolvedValue({
      id: "change-real",
      memberId: OWN_MEMBER_ID,
      toStatus: "ACTIVE",
      requiresApproval: true,
      approvedAt: null,
      rejectedAt: null,
      changedById: "coordinator-a",
      member: { id: OWN_MEMBER_ID, clinicId: SESSION.clinicId, firstName: "A", lastName: "B" },
    });
    (dbMock as any).member.update.mockResolvedValue({ id: OWN_MEMBER_ID, firstName: "A", lastName: "B" });

    await expect(approveStatusChange(OWN_MEMBER_ID, "change-real")).resolves.not.toThrow();
    expect((dbMock as any).member.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: OWN_MEMBER_ID }, data: { status: "ACTIVE" } })
    );
  });
});
