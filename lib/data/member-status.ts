import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export async function getStatusHistory(memberId: string) {
  return db.memberStatusChange.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      changedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  });
}

export async function getPendingStatusChanges() {
  const session = await requireRole("SUPERVISOR", "ADMIN");

  return db.memberStatusChange.findMany({
    where: {
      member: { clinicId: session.clinicId },
      requiresApproval: true,
      approvedAt: null,
      rejectedAt: null,
    },
    orderBy: { createdAt: "asc" },
    include: {
      member: { select: { id: true, firstName: true, lastName: true } },
      changedBy: { select: { name: true } },
    },
  });
}
