import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbMock } from "../../../test/mocks/db";

const dbMock = createDbMock();
vi.mock("@/lib/db", () => ({ db: dbMock }));

const authorizeMemberAccess = vi.fn();
vi.mock("@/lib/dal", () => ({ authorizeMemberAccess }));

vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));

const SESSION = { userId: "user-a", clinicId: "clinic-a" };
const OWN_MEMBER_ID = "member-a"; // in the caller's own clinic

describe("care-plan.ts tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The caller legitimately owns member-a — authorizeMemberAccess already
    // enforces clinic scoping on the memberId itself, so every test here
    // is specifically about the *second* ID (carePlanId/goalId) that each
    // action takes as a separately-tampered-with parameter.
    authorizeMemberAccess.mockResolvedValue({
      session: SESSION,
      member: { id: OWN_MEMBER_ID, clinicId: SESSION.clinicId },
    });
  });

  it("saveCarePlan rejects a carePlanId belonging to a different member", async () => {
    const { saveCarePlan } = await import("../care-plan");
    (dbMock as any).carePlan.findUnique.mockResolvedValue({ id: "plan-x", memberId: "member-b" });

    await expect(saveCarePlan(OWN_MEMBER_ID, "plan-x", new FormData())).rejects.toThrow("Forbidden");
  });

  it("addGoal rejects a carePlanId belonging to a different member", async () => {
    const { addGoal } = await import("../care-plan");
    (dbMock as any).carePlan.findUnique.mockResolvedValue({ id: "plan-x", memberId: "member-b" });

    await expect(addGoal(OWN_MEMBER_ID, "plan-x")).rejects.toThrow("Forbidden");
  });

  it("saveGoal rejects a goalId whose care plan belongs to a different member", async () => {
    const { saveGoal } = await import("../care-plan");
    (dbMock as any).carePlanGoal.findUnique.mockResolvedValue({
      id: "goal-x",
      carePlanId: "plan-x",
      carePlan: { id: "plan-x", memberId: "member-b" },
    });

    await expect(saveGoal(OWN_MEMBER_ID, "plan-x", "goal-x", new FormData())).rejects.toThrow("Forbidden");
  });

  it("saveGoal rejects a goalId that belongs to a different carePlanId than claimed", async () => {
    const { saveGoal } = await import("../care-plan");
    // Goal legitimately belongs to this member, but under a different plan
    // than the one supplied in the call — still must be rejected.
    (dbMock as any).carePlanGoal.findUnique.mockResolvedValue({
      id: "goal-x",
      carePlanId: "plan-real",
      carePlan: { id: "plan-real", memberId: OWN_MEMBER_ID },
    });

    await expect(saveGoal(OWN_MEMBER_ID, "plan-claimed", "goal-x", new FormData())).rejects.toThrow("Forbidden");
  });

  it("updateGoalStatus rejects a goalId whose care plan belongs to a different member", async () => {
    const { updateGoalStatus } = await import("../care-plan");
    (dbMock as any).carePlanGoal.findUnique.mockResolvedValue({
      id: "goal-x",
      carePlanId: "plan-x",
      carePlan: { id: "plan-x", memberId: "member-b" },
    });

    await expect(updateGoalStatus(OWN_MEMBER_ID, "goal-x", "COMPLETE")).rejects.toThrow("Forbidden");
  });

  it("addProgressNote rejects a goalId that belongs to a different carePlanId than claimed", async () => {
    const { addProgressNote } = await import("../care-plan");
    (dbMock as any).carePlanGoal.findUnique.mockResolvedValue({
      id: "goal-x",
      carePlanId: "plan-real",
      carePlan: { id: "plan-real", memberId: OWN_MEMBER_ID },
    });

    const formData = new FormData();
    formData.append("note", "should never be written");
    await expect(addProgressNote(OWN_MEMBER_ID, "plan-claimed", "goal-x", formData)).rejects.toThrow("Forbidden");
    expect((dbMock as any).carePlanProgressNote.create).not.toHaveBeenCalled();
  });

  it("saveGoal succeeds when the goal genuinely belongs to the claimed member and carePlan", async () => {
    const { saveGoal } = await import("../care-plan");
    (dbMock as any).carePlanGoal.findUnique.mockResolvedValue({
      id: "goal-real",
      carePlanId: "plan-real",
      carePlan: { id: "plan-real", memberId: OWN_MEMBER_ID },
    });

    await expect(saveGoal(OWN_MEMBER_ID, "plan-real", "goal-real", new FormData())).resolves.not.toThrow();
    expect((dbMock as any).carePlanGoal.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "goal-real" } }));
  });
});
