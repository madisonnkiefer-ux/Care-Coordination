"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { AssessmentStatus } from "@/app/generated/prisma/client";

export async function saveCareCoordinationNote(memberId: string, noteId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.careCoordinationNote.findUnique({ where: { id: noteId }, include: { intakeVersion: true } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");
  if (existing.intakeVersion?.signedAt) throw new Error("This record is signed and locked");

  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  const selectOrCustom = (key: string) => str(`${key}Custom`) ?? str(key);

  const yesNo = (key: string) => {
    const value = formData.get(key);
    if (value === "yes") return true;
    if (value === "no") return false;
    return null;
  };

  const yesNoNa = (key: string) => {
    const value = formData.get(key);
    return value === "yes" || value === "no" || value === "na" ? value : null;
  };

  const list = (key: string) => formData.getAll(key).filter((v): v is string => typeof v === "string");

  const intent = String(formData.get("intent") ?? "draft");
  const status: AssessmentStatus = intent === "complete" ? "COMPLETED" : "DRAFT";

  const data = {
    status,
    physicalHealthSummary: str("physicalHealthSummary"),
    behavioralHealthSummary: str("behavioralHealthSummary"),
    safetyVisionHearingCaregiverObservations: str("safetyVisionHearingCaregiverObservations"),
    hrsnAndAdditionalObservations: str("hrsnAndAdditionalObservations"),
    communityProviderReferrals: str("communityProviderReferrals"),
    schedulingAssistanceProvided: str("schedulingAssistanceProvided"),

    ccl1Criteria: list("ccl1Criteria"),
    ccl1OtherSpecify: str("ccl1OtherSpecify"),
    ccl2Criteria: list("ccl2Criteria"),
    ccl2OtherSpecify: str("ccl2OtherSpecify"),
    cannotBeLeveledDownIndicators: list("cannotBeLeveledDownIndicators"),

    careCoordinationLevel: selectOrCustom("careCoordinationLevel"),
    eligibilityConclusionsSummary: str("eligibilityConclusionsSummary"),

    cbsqCbmaCompleted: yesNoNa("cbsqCbmaCompleted"),
    cbsqCbmaNotCompletedExplain: str("cbsqCbmaNotCompletedExplain"),

    hasCoe100Abp: yesNo("hasCoe100Abp"),
    wantsAbpExemptEvaluation: yesNo("wantsAbpExemptEvaluation"),
    abpClassification: str("abpClassification"),
    qualifiesForAbpExempt: yesNo("qualifiesForAbpExempt"),
    abpExemptReason: str("abpExemptReason"),

    hcbsSettingsRuleAssessed: yesNoNa("hcbsSettingsRuleAssessed"),

    providedServicesBenefitsInfo: yesNo("providedServicesBenefitsInfo"),
    providedServicesBenefitsInfoExplain: str("providedServicesBenefitsInfoExplain"),

    memberSatisfactionDescription: str("memberSatisfactionDescription"),
    complexCaseManagementOrNfloc: str("complexCaseManagementOrNfloc"),
  };

  await db.careCoordinationNote.update({ where: { id: noteId }, data });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "CareCoordinationNote",
    resourceId: noteId,
    metadata: { status },
  });

  revalidatePath(`/members/${memberId}/intake`);
  redirect(`/members/${memberId}/intake?tab=notes`);
}
