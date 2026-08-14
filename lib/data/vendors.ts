import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export async function getVendors() {
  const session = await requireRole("ADMIN");

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
