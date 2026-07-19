import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";

export async function getGeneralCommunicationFormData(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const records = await db.generalCommunication.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  return { member, records };
}
