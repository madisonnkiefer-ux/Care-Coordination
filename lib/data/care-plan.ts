import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";

export async function getCarePlanFormData(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const records = await db.carePlan.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      teamMembers: true,
      medications: true,
      backupContacts: true,
      disasterContacts: true,
      goals: {
        orderBy: { createdAt: "asc" },
        include: { progressNotes: { orderBy: { date: "asc" } } },
      },
    },
  });

  return { member, records };
}
