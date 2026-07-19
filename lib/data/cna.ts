import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";

export async function getCnaFormData(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const draft = await db.cnaAssessment.findFirst({
    where: { memberId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });

  const latestCompleted = await db.cnaAssessment.findFirst({
    where: { memberId, status: "COMPLETED" },
    orderBy: { assessmentDate: "desc" },
  });

  return {
    member,
    draft,
    latestCompletedDate: latestCompleted?.assessmentDate ?? null,
  };
}
