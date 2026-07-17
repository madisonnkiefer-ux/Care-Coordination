"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { LIFE_DOMAINS } from "@/lib/data/cna";
import type { AssessmentStatus } from "@/app/generated/prisma/client";

export async function saveCna(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const intent = String(formData.get("intent") ?? "draft");
  const status: AssessmentStatus = intent === "complete" ? "COMPLETED" : "DRAFT";

  const existingDraft = await db.cnaAssessment.findFirst({
    where: { memberId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });

  const assessmentType = String(formData.get("assessmentType") ?? "Initial CNA");
  const summaryNotes = String(formData.get("summaryNotes") ?? "").trim() || null;

  const assessment = await db.cnaAssessment.upsert({
    where: { id: existingDraft?.id ?? "__none__" },
    create: {
      memberId,
      assessorId: session.userId,
      assessmentType,
      status,
      summaryNotes,
    },
    update: {
      assessmentType,
      status,
      summaryNotes,
      assessmentDate: status === "COMPLETED" ? new Date() : undefined,
    },
  });

  for (const { key } of LIFE_DOMAINS) {
    const hasNeeds = formData.get(`hasNeeds_${key}`) === "on";
    const needsCount = Number(formData.get(`needsCount_${key}`) ?? 0) || 0;
    const strengths = String(formData.get(`strengths_${key}`) ?? "").trim() || null;
    const notes = String(formData.get(`notes_${key}`) ?? "").trim() || null;

    await db.cnaDomainResult.upsert({
      where: { assessmentId_domain: { assessmentId: assessment.id, domain: key } },
      create: { assessmentId: assessment.id, domain: key, hasNeeds, needsCount, strengths, notes },
      update: { hasNeeds, needsCount, strengths, notes },
    });
  }

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: existingDraft ? "UPDATE" : "CREATE",
    resource: "CnaAssessment",
    resourceId: assessment.id,
    metadata: { status },
  });

  redirect(`/members/${memberId}/intake`);
}
