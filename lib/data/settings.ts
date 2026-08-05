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

// Office directory — deliberately not scoped to the caller's own clinic:
// admins need to see and manage the full list of offices to assign/edit
// office codes and stand up a new office's first admin account. This
// exposes office metadata only (name, code, staff count), never another
// office's members or PHI.
export async function getAllOffices() {
  await requireRole("ADMIN");

  return db.clinic.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });
}
