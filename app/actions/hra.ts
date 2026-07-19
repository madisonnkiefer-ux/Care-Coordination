"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { AssessmentStatus } from "@/app/generated/prisma/client";

export async function saveHra(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

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

  const date = (key: string) => {
    const value = str(key);
    return value ? new Date(value) : null;
  };

  const intent = String(formData.get("intent") ?? "draft");
  const status: AssessmentStatus = intent === "complete" ? "COMPLETED" : "DRAFT";

  const existingDraft = await db.hraAssessment.findFirst({
    where: { memberId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    status,
    assessmentDate: date("assessmentDate") ?? undefined,
    assessmentType: str("assessmentType"),
    assessmentMethod: str("assessmentMethod"),
    assessmentMethodOther: str("assessmentMethodOther"),

    languageNeedOtherThanEnglish: yesNo("languageNeedOtherThanEnglish"),
    needsTranslationServices: yesNo("needsTranslationServices"),

    specialPreferences: selectOrCustom("specialPreferences"),
    specialPreferencesDescribe: str("specialPreferencesDescribe"),

    healthConditions: selectOrCustom("healthConditions"),
    healthConditionsDescribe: str("healthConditionsDescribe"),

    sexAssignedAtBirth: selectOrCustom("sexAssignedAtBirth"),
    currentGender: selectOrCustom("currentGender"),
    currentGenderOther: str("currentGenderOther"),
    sexualIdentity: selectOrCustom("sexualIdentity"),
    sexualIdentityOther: str("sexualIdentityOther"),
    preferredPronouns: str("preferredPronouns"),

    isPregnant: yesNo("isPregnant"),
    perinatalPostpartumOrYoungChild: yesNoNa("perinatalPostpartumOrYoungChild"),

    usesTobaccoNicotine: yesNoNa("usesTobaccoNicotine"),
    interestedInCessationProgram: yesNoNa("interestedInCessationProgram"),
    historyOfTobaccoUse: yesNo("historyOfTobaccoUse"),

    worriedAboutFood: yesNoNa("worriedAboutFood"),
    reliableTransportation: yesNoNa("reliableTransportation"),
    needsHelpFindingProvider: yesNoNa("needsHelpFindingProvider"),

    erVisitsPast12Months: yesNo("erVisitsPast12Months"),
    erVisitCount: str("erVisitCount"),

    hospitalOvernightPast6Months: yesNo("hospitalOvernightPast6Months"),
    readmittedWithin30Days: yesNo("readmittedWithin30Days"),

    medicationsCount: str("medicationsCount"),

    currentSituations: selectOrCustom("currentSituations"),

    livingSituation: selectOrCustom("livingSituation"),
    livingSituationOther: str("livingSituationOther"),

    needsHelpWith2OrMoreAdls: yesNo("needsHelpWith2OrMoreAdls"),
    adlHelpNeeded: selectOrCustom("adlHelpNeeded"),
    adlHelpOther: str("adlHelpOther"),

    hasLivingWillOrAdvanceDirective: yesNo("hasLivingWillOrAdvanceDirective"),
    wantsMoreAdvanceDirectiveInfo: yesNo("wantsMoreAdvanceDirectiveInfo"),

    mainHealthConcerns: str("mainHealthConcerns"),
    mostSignificantNeedsToday: str("mostSignificantNeedsToday"),

    interestedInCareCoordination: yesNo("interestedInCareCoordination"),
  };

  const assessment = await db.hraAssessment.upsert({
    where: { id: existingDraft?.id ?? "__none__" },
    create: { memberId, assessorId: session.userId, ...data },
    update: data,
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: existingDraft ? "UPDATE" : "CREATE",
    resource: "HraAssessment",
    resourceId: assessment.id,
    metadata: { status },
  });

  redirect(`/members/${memberId}/intake`);
}
