import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbMock } from "../../../test/mocks/db";

const dbMock = createDbMock();
vi.mock("@/lib/db", () => ({ db: dbMock }));

const authorizeMemberAccess = vi.fn();
vi.mock("@/lib/dal", () => ({ authorizeMemberAccess }));

vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }));

const SESSION = { userId: "user-a", clinicId: "clinic-a" };
const OWN_MEMBER_ID = "member-a";

describe("documents.ts tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeMemberAccess.mockResolvedValue({
      session: SESSION,
      member: { id: OWN_MEMBER_ID, clinicId: SESSION.clinicId, assignedCoordinatorId: null, firstName: "A", lastName: "B" },
    });
  });

  it("rejects a storage key uploaded under a different member's prefix", async () => {
    const { saveDocument } = await import("../documents");

    await expect(
      saveDocument(OWN_MEMBER_ID, { name: "file.pdf", category: "OTHER" as never, key: "member-b/some-file.pdf" })
    ).rejects.toThrow("Forbidden");
    expect((dbMock as any).document.create).not.toHaveBeenCalled();
  });

  it("accepts a storage key genuinely scoped to the claimed member", async () => {
    const { saveDocument } = await import("../documents");
    (dbMock as any).document.create.mockResolvedValue({ id: "doc-1" });

    await expect(
      saveDocument(OWN_MEMBER_ID, { name: "file.pdf", category: "OTHER" as never, key: `${OWN_MEMBER_ID}/some-file.pdf` })
    ).resolves.not.toThrow();
    expect((dbMock as any).document.create).toHaveBeenCalled();
  });
});
