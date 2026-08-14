import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export async function getAuditLog(userId?: string) {
  const session = await requireRole("ADMIN");

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
