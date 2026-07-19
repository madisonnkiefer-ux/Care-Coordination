import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function getTocFormData(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const records = await db.tocRecord.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { signedBy: { select: { name: true } }, needs: true },
  });

  await writeAuditLog({ userId: session.userId, memberId, action: "VIEW", resource: "TocRecord", resourceId: memberId });

  return { member, records };
}
