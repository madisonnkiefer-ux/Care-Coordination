import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function getCareCoordinationNoteFormData(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const records = await db.careCoordinationNote.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { signedBy: { select: { name: true } } },
  });

  await writeAuditLog({ userId: session.userId, memberId, action: "VIEW", resource: "CareCoordinationNote", resourceId: memberId });

  return { member, records };
}
