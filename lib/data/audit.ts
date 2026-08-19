import "server-only";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";

export async function getAuditLog(userId?: string) {
  const session = await requirePermission("VIEW_AUDIT_LOG");

  return db.auditLog.findMany({
    where: {
      user: { clinicId: session.clinicId },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
      member: { select: { firstName: true, lastName: true } },
    },
  });
}
