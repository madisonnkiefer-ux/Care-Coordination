"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { AssessmentStatus } from "@/app/generated/prisma/client";

export async function saveCna(memberId: string, formData: FormData) {
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

  const int = (key: string) => {
    const value = str(key);
    if (value === null) return null;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
  };

  const intent = String(formData.get("intent") ?? "draft");
  const status: AssessmentStatus = intent === "complete" ? "COMPLETED" : "DRAFT";

  const existingDraft = await db.cnaAssessment.findFirst({
    where: { memberId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    status,
    assessmentDate: date("assessmentDate") ?? undefined,
    assessmentType: formData.getAll("assessmentType").filter((v): v is string => typeof v === "string"),
    assessmentMethod: selectOrCustom("assessmentMethod"),

    // Introduction
    hasImminentRisk: yesNo("hasImminentRisk"),
    meetsCbsqCbma: yesNo("meetsCbsqCbma"),
    languageNeedOtherThanEnglish: yesNo("languageNeedOtherThanEnglish"),
    needsTranslationServices: yesNo("needsTranslationServices"),
    needsTranslationDescribe: str("needsTranslationDescribe"),
    specialPreferences: selectOrCustom("specialPreferences"),
    specialPreferencesDescribe: str("specialPreferencesDescribe"),
    erVisitsLast12Months: selectOrCustom("erVisitsLast12Months"),
    erVisitsDescribe: str("erVisitsDescribe"),
    needsEdAlternativesInfo: yesNo("needsEdAlternativesInfo"),
    hospitalStaysLast6Months: selectOrCustom("hospitalStaysLast6Months"),
    hospitalStaysDescribe: str("hospitalStaysDescribe"),
    waitingForTransplant: yesNo("waitingForTransplant"),
    waitingForTransplantSpecify: str("waitingForTransplantSpecify"),

    // Vision/Hearing/Dental
    hasVisionIssues: yesNo("hasVisionIssues"),
    visionIssuesDescribe: str("visionIssuesDescribe"),
    lastVisionCheck: str("lastVisionCheck"),
    needsEyeCareAppointmentHelp: yesNo("needsEyeCareAppointmentHelp"),
    hasHearingIssues: yesNo("hasHearingIssues"),
    hearingIssuesDescribe: str("hearingIssuesDescribe"),
    lastHearingTest: str("lastHearingTest"),
    needsHearingApptHelp: yesNo("needsHearingApptHelp"),
    needsHearingApptHelpDescribe: str("needsHearingApptHelpDescribe"),
    lastDentalVisit: str("lastDentalVisit"),
    needsDentalApptHelp: yesNo("needsDentalApptHelp"),
    needsDentalApptHelpDescribe: str("needsDentalApptHelpDescribe"),

    // Pregnancy
    isCurrentlyPregnant: yesNo("isCurrentlyPregnant"),
    hadPerinatalCare: yesNoNa("hadPerinatalCare"),
    pregnancyDueDate: date("pregnancyDueDate"),
    pregnancyDueDateNa: yesNo("pregnancyDueDateNa"),
    pregnancyHighRisk: yesNoNa("pregnancyHighRisk"),
    needsMaternalProviderHelp: yesNoNa("needsMaternalProviderHelp"),
    pregnantWithinLast12Months: yesNoNa("pregnantWithinLast12Months"),
    hadPostpartumDepression: yesNoNa("hadPostpartumDepression"),
    timesPregnant: str("timesPregnant"),
    viableBirths: str("viableBirths"),
    historyOfMultipleBirths: yesNoNa("historyOfMultipleBirths"),
    everHadCSection: yesNoNa("everHadCSection"),
    priorPregnancyComplications: yesNoNa("priorPregnancyComplications"),
    priorPregnancyComplicationsSpecify: str("priorPregnancyComplicationsSpecify"),
    interestedInHomeVisiting: yesNoNa("interestedInHomeVisiting"),
    homeVisitingProviderReferredTo: str("homeVisitingProviderReferredTo"),

    // Physical Health
    overallHealthVsYearAgo: selectOrCustom("overallHealthVsYearAgo"),
    physicalHealthConditionsDiagnosed: formData.get("physicalHealthConditionsDiagnosed") === "on",
    physicalHealthConditionsSelfReported: formData.get("physicalHealthConditionsSelfReported") === "on",
    physicalHealthConditionsDescribe: str("physicalHealthConditionsDescribe"),
    heightInches: str("heightInches"),
    weightLbs: str("weightLbs"),
    hasNonMedicationAllergies: yesNo("hasNonMedicationAllergies"),
    nonMedicationAllergiesSpecify: str("nonMedicationAllergiesSpecify"),
    seenProviderLast12Months: yesNo("seenProviderLast12Months"),
    seenProviderLast12MonthsSpecify: str("seenProviderLast12MonthsSpecify"),
    needsPcpAppointmentHelp: yesNo("needsPcpAppointmentHelp"),
    hadWellChildVisit: yesNo("hadWellChildVisit"),
    wellChildVisitDate: date("wellChildVisitDate"),
    lastMammogram: str("lastMammogram"),
    lastPapSmear: str("lastPapSmear"),
    hadColorectalScreening: yesNo("hadColorectalScreening"),
    colorectalScreeningYesSpecify: str("colorectalScreeningYesSpecify"),
    colorectalScreeningNoSpecify: str("colorectalScreeningNoSpecify"),
    pastSurgeriesProceduresTreatments: str("pastSurgeriesProceduresTreatments"),
    upcomingMedicalServices: yesNo("upcomingMedicalServices"),
    upcomingMedicalServicesSpecify: str("upcomingMedicalServicesSpecify"),
    needsSchedulingHelp: yesNo("needsSchedulingHelp"),
    usesOrNeedsDme: yesNo("usesOrNeedsDme"),
    usesOrNeedsDmeSpecify: str("usesOrNeedsDmeSpecify"),
    needsDmeObtainingHelp: yesNo("needsDmeObtainingHelp"),
    needsDmeObtainingHelpSpecify: str("needsDmeObtainingHelpSpecify"),
    hasNeurologicalDiagnoses: yesNo("hasNeurologicalDiagnoses"),
    hasNeurologicalDiagnosesSpecify: str("hasNeurologicalDiagnosesSpecify"),
    usesTobaccoNicotine: yesNo("usesTobaccoNicotine"),
    interestedInCessationProgram: yesNo("interestedInCessationProgram"),

    // Medication
    takesMedications: yesNo("takesMedications"),
    takesMedicationsSpecify: str("takesMedicationsSpecify"),
    ableToObtainAllMedications: yesNo("ableToObtainAllMedications"),
    ableToObtainAllMedicationsSpecify: str("ableToObtainAllMedicationsSpecify"),
    hasDiscontinuedMedications: yesNo("hasDiscontinuedMedications"),
    hasDiscontinuedMedicationsSpecify: str("hasDiscontinuedMedicationsSpecify"),
    hasMedicationAllergies: yesNo("hasMedicationAllergies"),
    hasMedicationAllergiesSpecify: str("hasMedicationAllergiesSpecify"),
    takesLifeSustainingMedications: yesNo("takesLifeSustainingMedications"),
    takesLifeSustainingMedicationsSpecify: str("takesLifeSustainingMedicationsSpecify"),

    // Behavioral Health
    behavioralHealthConditionsDiagnosed: formData.get("behavioralHealthConditionsDiagnosed") === "on",
    behavioralHealthConditionsSelfReported: formData.get("behavioralHealthConditionsSelfReported") === "on",
    behavioralHealthConditionsNa: formData.get("behavioralHealthConditionsNa") === "on",
    behavioralHealthConditionsDescribe: str("behavioralHealthConditionsDescribe"),
    bhAdmissionsLast12Months: yesNo("bhAdmissionsLast12Months"),
    bhAdmissionsSpecify: str("bhAdmissionsSpecify"),
    lastBhProviderVisit: str("lastBhProviderVisit"),
    needsBhProviderHelp: yesNo("needsBhProviderHelp"),
    needsBhProviderHelpSpecify: str("needsBhProviderHelpSpecify"),
    understandsBhCondition: yesNo("understandsBhCondition"),
    hasSubstanceUseIssues: yesNo("hasSubstanceUseIssues"),
    hasSubstanceUseIssuesSpecify: str("hasSubstanceUseIssuesSpecify"),

    // PHQ-2/PHQ-9
    phqLittleInterest: int("phqLittleInterest"),
    phqFeelingDown: int("phqFeelingDown"),
    phqTroubleSleeping: int("phqTroubleSleeping"),
    phqTiredLowEnergy: int("phqTiredLowEnergy"),
    phqAppetite: int("phqAppetite"),
    phqFeelingBad: int("phqFeelingBad"),
    phqTroubleConcentrating: int("phqTroubleConcentrating"),
    phqMovingSpeaking: int("phqMovingSpeaking"),
    phqSelfHarmThoughts: int("phqSelfHarmThoughts"),
    phqDifficultyLevel: selectOrCustom("phqDifficultyLevel"),

    // CAGE
    cageCutDown: yesNo("cageCutDown"),
    cageCutDownSpecify: str("cageCutDownSpecify"),
    cageAnnoyed: yesNo("cageAnnoyed"),
    cageAnnoyedSpecify: str("cageAnnoyedSpecify"),
    cageGuilty: yesNo("cageGuilty"),
    cageGuiltySpecify: str("cageGuiltySpecify"),
    cageEyeOpener: yesNo("cageEyeOpener"),
    cageEyeOpenerSpecify: str("cageEyeOpenerSpecify"),

    // HRSN
    hasHousingInsecurity: yesNo("hasHousingInsecurity"),
    hasHousingInsecuritySpecify: str("hasHousingInsecuritySpecify"),
    livingArrangement: selectOrCustom("livingArrangement"),
    livingArrangementSpecify: str("livingArrangementSpecify"),
    feelsSafeWhereLiving: yesNo("feelsSafeWhereLiving"),
    feelsSafeWhereLivingSpecify: str("feelsSafeWhereLivingSpecify"),
    hasUrgentNeeds: yesNo("hasUrgentNeeds"),
    hasUrgentNeedsSpecify: str("hasUrgentNeedsSpecify"),
    wantsHousingSpecialistReferral: yesNo("wantsHousingSpecialistReferral"),
    householdReceivesCbServices: yesNo("householdReceivesCbServices"),
    householdReceivesCbServicesSpecify: str("householdReceivesCbServicesSpecify"),
    hasNaturalSupports: yesNo("hasNaturalSupports"),
    naturalSupportsContactInfo: str("naturalSupportsContactInfo"),
    naturalSupportMeetsNeeds: yesNo("naturalSupportMeetsNeeds"),
    naturalSupportMeetsNeedsExplain: str("naturalSupportMeetsNeedsExplain"),
    hasPaidCaregiver: yesNo("hasPaidCaregiver"),
    paidCaregiverContactInfo: str("paidCaregiverContactInfo"),
    paidCaregiverHoursPerWeek: str("paidCaregiverHoursPerWeek"),
    hasSufficientChildCare: yesNoNa("hasSufficientChildCare"),
    worriedAboutFood: yesNo("worriedAboutFood"),
    employmentStatus: str("employmentStatus"),
    primaryIncomeSource: str("primaryIncomeSource"),
    managesFinancesIndependently: yesNo("managesFinancesIndependently"),
    managesFinancesIndependentlySpecify: str("managesFinancesIndependentlySpecify"),
    hasLegalIssues: yesNo("hasLegalIssues"),
    hasLegalIssuesSpecify: str("hasLegalIssuesSpecify"),
    reliableTransportation: yesNo("reliableTransportation"),
    reliableTransportationSpecify: str("reliableTransportationSpecify"),
    referralsNeeded: selectOrCustom("referralsNeeded"),

    // ADLs
    adlBathingNeeded: yesNo("adlBathingNeeded"),
    adlBathingSpecify: str("adlBathingSpecify"),
    adlDressingNeeded: yesNo("adlDressingNeeded"),
    adlDressingSpecify: str("adlDressingSpecify"),
    adlGroomingNeeded: yesNo("adlGroomingNeeded"),
    adlGroomingSpecify: str("adlGroomingSpecify"),
    adlBowelBladderNeeded: yesNo("adlBowelBladderNeeded"),
    adlBowelBladderSpecify: str("adlBowelBladderSpecify"),
    adlToiletingNeeded: yesNo("adlToiletingNeeded"),
    adlToiletingSpecify: str("adlToiletingSpecify"),
    adlEatingNeeded: yesNo("adlEatingNeeded"),
    adlEatingSpecify: str("adlEatingSpecify"),
    adlMobilityNeeded: yesNo("adlMobilityNeeded"),
    adlMobilitySpecify: str("adlMobilitySpecify"),
    adlTransferNeeded: yesNo("adlTransferNeeded"),
    adlTransferSpecify: str("adlTransferSpecify"),
    adlMealPrepNeeded: yesNo("adlMealPrepNeeded"),
    adlMealPrepSpecify: str("adlMealPrepSpecify"),
    adlDailyMedicationNeeded: yesNo("adlDailyMedicationNeeded"),
    adlDailyMedicationSpecify: str("adlDailyMedicationSpecify"),

    // IADLs
    iadlSupportServicesNeeded: yesNo("iadlSupportServicesNeeded"),
    iadlSupportServicesSpecify: str("iadlSupportServicesSpecify"),
    iadlDmeMaintenanceNeeded: yesNo("iadlDmeMaintenanceNeeded"),
    iadlDmeMaintenanceSpecify: str("iadlDmeMaintenanceSpecify"),
    iadlLightHousekeepingNeeded: yesNo("iadlLightHousekeepingNeeded"),
    iadlLightHousekeepingSpecify: str("iadlLightHousekeepingSpecify"),
    iadlFinancesNeeded: yesNo("iadlFinancesNeeded"),
    iadlFinancesSpecify: str("iadlFinancesSpecify"),

    hasFallRiskIndication: yesNo("hasFallRiskIndication"),
    hasFallRiskIndicationSpecify: str("hasFallRiskIndicationSpecify"),
    needsNfLocEvaluation: yesNo("needsNfLocEvaluation"),

    // Summary
    mainHealthGoal: str("mainHealthGoal"),
    mostSignificantNeedsToday: str("mostSignificantNeedsToday"),
    hasAdvanceDirective: yesNo("hasAdvanceDirective"),
    wantsAdvanceDirectiveInfo: yesNo("wantsAdvanceDirectiveInfo"),
    interestedInCareCoordination: yesNo("interestedInCareCoordination"),
    declinationExplainedAndSigned: yesNoNa("declinationExplainedAndSigned"),
    declinationReason: str("declinationReason"),
  };

  const assessment = await db.cnaAssessment.upsert({
    where: { id: existingDraft?.id ?? "__none__" },
    create: { memberId, assessorId: session.userId, ...data },
    update: data,
  });

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
