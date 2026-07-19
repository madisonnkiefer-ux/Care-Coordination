import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";

export async function getHraFormData(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const records = await db.hraAssessment.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { signedBy: { select: { name: true } } },
  });

  return { member, records };
}
