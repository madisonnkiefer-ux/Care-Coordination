import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";

export const SCREENING_TOOLS = [
  { key: "EPDS", label: "Edinburgh Postnatal Depression Scale (EPDS)" },
  { key: "PREGNANCY_RISK", label: "Pregnancy Risk Assessment" },
  { key: "SDOH", label: "Social Determinants of Health (SDOH)" },
  { key: "ASSIST", label: "Substance Use Screening (ASSIST)" },
  { key: "HITS", label: "Intimate Partner Violence (HITS)" },
] as const;

export async function getHraFormData(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const draft = await db.hraAssessment.findFirst({
    where: { memberId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    include: { screenings: true },
  });

  const latestCompleted = await db.hraAssessment.findFirst({
    where: { memberId, status: "COMPLETED" },
    orderBy: { assessmentDate: "desc" },
  });

  const screeningMap = new Map(draft?.screenings.map((s) => [s.toolName, s]));

  return {
    member,
    draft,
    latestCompletedDate: latestCompleted?.assessmentDate ?? null,
    tools: SCREENING_TOOLS.map(({ key, label }) => ({
      key,
      label,
      existing: screeningMap.get(key) ?? null,
    })),
  };
}
