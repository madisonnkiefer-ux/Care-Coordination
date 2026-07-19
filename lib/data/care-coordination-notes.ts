import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";

export async function getCareCoordinationNoteFormData(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const draft = await db.careCoordinationNote.findFirst({
    where: { memberId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });

  const latestCompleted = await db.careCoordinationNote.findFirst({
    where: { memberId, status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
  });

  return {
    member,
    draft,
    latestCompletedDate: latestCompleted?.updatedAt ?? null,
  };
}
