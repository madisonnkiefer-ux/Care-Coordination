"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { SCREENING_TOOLS } from "@/lib/data/hra";
import type { AssessmentStatus } from "@/app/generated/prisma/client";

export async function saveHra(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const intent = String(formData.get("intent") ?? "draft");
  const status: AssessmentStatus = intent === "complete" ? "COMPLETED" : "DRAFT";

  const existingDraft = await db.hraAssessment.findFirst({
    where: { memberId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });

  const assessment = await db.hraAssessment.upsert({
    where: { id: existingDraft?.id ?? "__none__" },
    create: { memberId, assessorId: session.userId, status },
    update: { status, assessmentDate: status === "COMPLETED" ? new Date() : undefined },
  });

  for (const { key } of SCREENING_TOOLS) {
    const score = String(formData.get(`score_${key}`) ?? "").trim() || null;
    const riskLevel = String(formData.get(`riskLevel_${key}`) ?? "").trim() || null;
    const notes = String(formData.get(`notes_${key}`) ?? "").trim() || null;
    const completedRaw = String(formData.get(`completed_${key}`) ?? "");
    const completedAt = completedRaw === "on" ? new Date() : null;

    if (!score && !riskLevel && !notes && !completedAt) continue;

    await db.hraScreening.upsert({
      where: { assessmentId_toolName: { assessmentId: assessment.id, toolName: key } },
      create: { assessmentId: assessment.id, toolName: key, score, riskLevel, notes, completedAt },
      update: { score, riskLevel, notes, completedAt },
    });
  }

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: existingDraft ? "UPDATE" : "CREATE",
    resource: "HraAssessment",
    resourceId: assessment.id,
    metadata: { status },
  });

  redirect(`/members/${memberId}`);
}
