import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";

export async function getCarePlanData(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const carePlan = await db.carePlan.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { goals: { orderBy: { createdAt: "asc" } } },
  });

  return { member, carePlan };
}
