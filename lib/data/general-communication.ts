import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function getGeneralCommunicationFormData(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const records = await db.generalCommunication.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  await writeAuditLog({ userId: session.userId, memberId, action: "VIEW", resource: "GeneralCommunication", resourceId: memberId });

  return { member, records };
}
