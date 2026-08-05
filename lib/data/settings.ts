import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export async function getClinicUsers() {
  const session = await requireRole("ADMIN");

  return db.user.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
}
