import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function getHedisFormData(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const record = await db.hedisMeasures.findUnique({ where: { memberId } });

  await writeAuditLog({ userId: session.userId, memberId, action: "VIEW", resource: "HedisMeasures", resourceId: memberId });

  return { member, record };
}
