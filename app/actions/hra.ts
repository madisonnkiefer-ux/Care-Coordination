"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { saveCustomAnswers } from "@/lib/custom-questions-save";
import type { AssessmentStatus } from "@/app/generated/prisma/client";

export async function saveHra(memberId: string, hraId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.hraAssessment.findUnique({ where: { id: hraId }, include: { intakeVersion: true } });
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

  const date = (key: string) => {
    const value = str(key);
    return value ? new Date(value) : null;
  };

  const intent = String(formData.get("intent") ?? "draft");
  const status: AssessmentStatus = intent === "complete" ? "COMPLETED" : "DRAFT";

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

  await db.hraAssessment.update({ where: { id: hraId }, data });

  await saveCustomAnswers(member.clinicId, "hra", hraId, formData);

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "HraAssessment",
    resourceId: hraId,
    metadata: { status },
  });

  revalidatePath(`/members/${memberId}/intake`);
  redirect(`/members/${memberId}/intake?tab=hra`);
}
