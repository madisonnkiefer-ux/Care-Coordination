import "server-only";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

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
  const session = await requirePermission("VIEW_SUPERVISOR_DASHBOARD");

  await writeAuditLog({
    userId: session.userId,
    action: "VIEW",
    resource: "PendingStatusChanges",
  });

  return db.memberStatusChange.findMany({
    where: {
      member: { clinicId: session.clinicId, deletedAt: null },
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
