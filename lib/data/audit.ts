import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export async function getAuditLog() {
  const session = await requireRole("SUPERVISOR", "ADMIN");

  return db.auditLog.findMany({
    where: { user: { clinicId: session.clinicId } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
      member: { select: { firstName: true, lastName: true } },
    },
  });
}
