import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDbMock } from "../../../test/mocks/db";

const dbMock = createDbMock();
vi.mock("@/lib/db", () => ({ db: dbMock }));

const requirePermission = vi.fn();
vi.mock("@/lib/dal", () => ({ requirePermission }));

vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));

const SESSION = { userId: "admin-a", clinicId: "clinic-a" };

describe("resources.ts tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue(SESSION);
  });

  it("updateResource rejects a resourceId belonging to a different clinic", async () => {
    const { updateResource } = await import("../resources");
    (dbMock as any).resourceEntry.findUnique.mockResolvedValue({ id: "res-x", clinicId: "clinic-b" });

    const formData = new FormData();
    formData.set("name", "Renamed");
    await expect(updateResource("res-x", formData)).rejects.toThrow("Not found");
    expect((dbMock as any).resourceEntry.update).not.toHaveBeenCalled();
  });

  it("deleteResource rejects a resourceId belonging to a different clinic", async () => {
    const { deleteResource } = await import("../resources");
    (dbMock as any).resourceEntry.findUnique.mockResolvedValue({ id: "res-x", clinicId: "clinic-b" });

    await expect(deleteResource("res-x")).rejects.toThrow("Not found");
    expect((dbMock as any).resourceEntry.delete).not.toHaveBeenCalled();
  });

  it("updateResource rejects a documentKey scoped to a different clinic's upload prefix", async () => {
    const { updateResource } = await import("../resources");
    (dbMock as any).resourceEntry.findUnique.mockResolvedValue({ id: "res-a", clinicId: SESSION.clinicId });

    const formData = new FormData();
    formData.set("name", "Renamed");
    formData.set("documentKey", "resources/clinic-b/some-file.pdf");
    await expect(updateResource("res-a", formData)).rejects.toThrow("Forbidden");
    expect((dbMock as any).resourceEntry.update).not.toHaveBeenCalled();
  });

  it("updateResource succeeds for a genuinely same-clinic resource", async () => {
    const { updateResource } = await import("../resources");
    (dbMock as any).resourceEntry.findUnique.mockResolvedValue({ id: "res-a", clinicId: SESSION.clinicId });

    const formData = new FormData();
    formData.set("name", "Renamed");
    await expect(updateResource("res-a", formData)).resolves.not.toThrow();
    expect((dbMock as any).resourceEntry.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "res-a" } }));
  });
});
