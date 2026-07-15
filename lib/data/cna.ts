import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import type { LifeDomain } from "@/app/generated/prisma/client";

export const LIFE_DOMAINS: { key: LifeDomain; label: string }[] = [
  { key: "PHYSICAL_HEALTH", label: "Physical Health" },
  { key: "BEHAVIORAL_HEALTH", label: "Behavioral Health" },
  { key: "SOCIAL_RELATIONSHIPS", label: "Social & Relationships" },
  { key: "PRACTICAL_NEEDS", label: "Practical Needs" },
  { key: "SAFETY", label: "Safety" },
  { key: "PREGNANCY_POSTPARTUM", label: "Pregnancy & Postpartum" },
];

export async function getCnaFormData(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const draft = await db.cnaAssessment.findFirst({
    where: { memberId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    include: { domains: true },
  });

  const latestCompleted = await db.cnaAssessment.findFirst({
    where: { memberId, status: "COMPLETED" },
    orderBy: { assessmentDate: "desc" },
  });

  const domainMap = new Map(draft?.domains.map((d) => [d.domain, d]));

  return {
    member,
    draft,
    latestCompletedDate: latestCompleted?.assessmentDate ?? null,
    domains: LIFE_DOMAINS.map(({ key, label }) => ({
      key,
      label,
      existing: domainMap.get(key) ?? null,
    })),
  };
}
