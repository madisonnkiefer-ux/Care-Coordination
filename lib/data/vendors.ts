import "server-only";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";

export async function getVendors() {
  const session = await requirePermission("MANAGE_VENDORS");

  return db.vendor.findMany({
    where: { clinicId: session.clinicId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      purpose: true,
      hasBaa: true,
      baaSignedDate: true,
      baaExpiresAt: true,
      contactName: true,
      contactEmail: true,
      notes: true,
      active: true,
      createdAt: true,
    },
  });
}
