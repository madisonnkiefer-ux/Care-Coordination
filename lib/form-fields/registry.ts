import {
  ETHNICITY_OPTIONS,
  RACE_OPTIONS,
  SEX_ASSIGNED_AT_BIRTH_OPTIONS,
  CURRENT_GENDER_OPTIONS,
  SEXUAL_IDENTITY_OPTIONS,
  ASSESSMENT_TYPE_OPTIONS,
  ASSESSMENT_METHOD_OPTIONS,
  SPECIAL_PREFERENCES_OPTIONS,
  HEALTH_CONDITIONS_OPTIONS,
  CURRENT_SITUATIONS_OPTIONS,
  LIVING_SITUATION_OPTIONS,
  LIVING_SITUATION_CNA_REQUIRED,
  ADL_HELP_OPTIONS,
  CNA_ASSESSMENT_TYPE_OPTIONS,
  CNA_ASSESSMENT_METHOD_OPTIONS,
  CNA_SPECIAL_PREFERENCES_OPTIONS,
  ER_VISITS_OPTIONS,
  HOSPITAL_STAYS_OPTIONS,
  OVERALL_HEALTH_OPTIONS,
  LIVING_ARRANGEMENT_OPTIONS,
  REFERRAL_NEEDED_OPTIONS,
  PHQ_DIFFICULTY_OPTIONS,
  CCL1_CRITERIA_OPTIONS,
  CCL2_CRITERIA_OPTIONS,
  CANNOT_BE_LEVELED_DOWN_OPTIONS,
  CARE_COORDINATION_LEVEL_OPTIONS,
  ABP_CLASSIFICATION_OPTIONS,
  COMPLEX_CASE_OPTIONS,
  PREFERRED_CONTACT_METHOD_OPTIONS,
  DISASTER_REVIEW_ITEMS_OPTIONS,
  GOAL_PRIORITY_OPTIONS,
} from "@/components/intake/options";
import { CONTACT_METHOD_OPTIONS, PERSON_CONTACTED_OPTIONS, UNSUCCESSFUL_REASON_OPTIONS } from "@/components/care-plan/outreach-options";
import { TRANSITION_TYPE_OPTIONS, TOC_NEEDS_SECTIONS } from "@/components/toc/needs-config";

// Every field an office admin can browse and re-word from Settings → Form
// Content, across every standardized form (Demographics, HRA, CNA, Care
// Coordination Notes, CCP, General Communication, TOC). Rendering doesn't
// depend on a field being listed here — components/intake/form-fields.tsx's
// primitives resolve any (form, name) pair automatically via
// lib/form-fields/context.tsx, falling back to their own hardcoded default.
// This registry exists purely so Settings has something browsable; a field
// missing from this list still works, it's just not offered for editing yet
// — safe to extend anytime without touching a single form component.
//
// Coverage is broad but not literally every micro-field (e.g. the repeated
// "If yes, specify" detail inputs next to many CNA questions aren't each
// individually listed) — the fields most likely to actually change when the
// state revises a form are covered: every question's own label/prompt, and
// every dropdown/checklist option list.
export type FormFieldDef = {
  key: string;
  form: "enrollment" | "ccp" | "toc";
  section: string;
  name: string;
  // Whether this field can be retired from new forms via Settings. False
  // for the fields required-assessment/scoring/roster logic reads by name
  // elsewhere in the app (see PROTECTED_FIELDS below) — those stay
  // reword-able but always present.
  hideable: boolean;
  defaultOptions: string[];
};

type Spec = readonly [key: string, section: string, name: string, options?: readonly string[]];

function expand(specs: readonly Spec[], form: FormFieldDef["form"]): FormFieldDef[] {
  return specs.map(([key, section, name, options]) => ({
    key,
    form,
    section,
    name,
    hideable: !PROTECTED_FIELDS.has(key),
    defaultOptions: options ? [...options] : [],
  }));
}

// ---------- Enrollment: Demographics (shared fields also used on the HRA) ----------

const DEMOGRAPHICS: Spec[] = [
  ["demographics.firstName", "Identity", "First Name"],
  ["demographics.middleName", "Identity", "Middle Name"],
  ["demographics.lastName", "Identity", "Last Name"],
  ["demographics.dateOfBirth", "Identity", "DOB"],
  ["demographics.medicaidId", "Identity", "Medicaid ID"],
  ["demographics.ethnicity", "Race & Ethnicity", "Ethnicity", ETHNICITY_OPTIONS],
  ["demographics.race", "Race & Ethnicity", "Race", RACE_OPTIONS],
  ["demographics.tribalAffiliation", "Race & Ethnicity", "Tribal Affiliation (if applicable)"],
  ["shared.sexAssignedAtBirth", "Sex, Gender & Sexual Identity", "Sex Assigned at Birth (also used on the HRA)", SEX_ASSIGNED_AT_BIRTH_OPTIONS],
  ["demographics.currentGenderOther", "Sex, Gender & Sexual Identity", "Current Gender — if other, please describe"],
  ["shared.currentGender", "Sex, Gender & Sexual Identity", "Current Gender (also used on the HRA)", CURRENT_GENDER_OPTIONS],
  ["shared.sexualIdentity", "Sex, Gender & Sexual Identity", "Current Sexual Identity (also used on the HRA)", SEXUAL_IDENTITY_OPTIONS],
  ["demographics.sexualIdentityOther", "Sex, Gender & Sexual Identity", "Current Sexual Identity — if other, please describe"],
  ["demographics.permissionForOtherToComplete", "Form Completion", "Has the member given permission for another person to complete this form?"],
  ["demographics.formCompletedByName", "Form Completion", "Name of person completing/assisting with this form"],
  ["demographics.formCompletedByRelationship", "Form Completion", "Their relationship to Member"],
  ["demographics.address", "Contact Information", "Member's Address"],
  ["demographics.phoneCell", "Contact Information", "Cell Phone"],
  ["demographics.phoneHome", "Contact Information", "Home Phone"],
  ["demographics.email", "Contact Information", "Email Address"],
  ["demographics.language", "Contact Information", "Preferred Language"],
  ["demographics.preferredContactVoice", "Contact Information", "Preferred Contact — Voice"],
  ["demographics.preferredContactText", "Contact Information", "Preferred Contact — Text"],
  ["demographics.preferredContactMail", "Contact Information", "Preferred Contact — Mail"],
  ["demographics.preferredContactEmail", "Contact Information", "Preferred Contact — Email"],
  ["demographics.emergencyContactName", "Emergency Contact", "Name"],
  ["demographics.emergencyContactRel", "Emergency Contact", "Relation to Member"],
  ["demographics.emergencyContactPhone", "Emergency Contact", "Phone"],
  ["demographics.mcoEnrollmentDate", "MCO & Medicaid Eligibility", "MCO Enrollment Date"],
  ["demographics.eligibilityCategory", "MCO & Medicaid Eligibility", "Category of Eligibility"],
  ["demographics.medicaidEligibilityBeginDate", "MCO & Medicaid Eligibility", "Medicaid Eligibility Begin Date"],
  ["demographics.medicaidEligibilityRenewalDate", "MCO & Medicaid Eligibility", "Medicaid Eligibility Renewal Date"],
  ["demographics.justiceInvolved", "Screening Questions", "Is the Member Justice-Involved?"],
  ["demographics.caraIndividual", "Screening Questions", "Is the Member a Comprehensive Addiction and Recovery Act (CARA) Individual?"],
  ["demographics.cyfdInvolved", "Screening Questions", "Is the Member Children Youth and Families Department (CYFD) involved or a Child in State Custody (CISC)?"],
  ["demographics.hasOtherInsurance", "Screening Questions", "Do you have any other insurance in addition to New Mexico Medicaid?"],
  ["demographics.onWaiver", "Screening Questions", "Is the member on a waiver?"],
  ["demographics.cnaCompletedByNameRelation", "Authorized Representative", "Name/Relation of Person Completing CNA, if other than identified Member"],
  ["demographics.representativeName", "Authorized Representative", "Representative Name"],
  ["demographics.representativePhone", "Authorized Representative", "Representative Phone"],
  ["demographics.representativeEmail", "Authorized Representative", "Representative Email"],
  ["demographics.decisionMaker", "Authorized Representative", "Who is the Decision Maker?"],
  ["demographics.representativeDocumentationSubmitted", "Authorized Representative", "Was the Documentation Submitted?"],
  ["demographics.representativeDocumentationType", "Authorized Representative", "Type of Documentation Submitted"],
  [
    "demographics.permissionToContactRepWithoutMember",
    "Authorized Representative",
    "Do we have permission to contact the representative without the Member present?",
  ],
];

// ---------- Enrollment: HRA ----------

const HRA: Spec[] = [
  ["hra.assessmentType", "HRA", "Assessment Type", ASSESSMENT_TYPE_OPTIONS],
  ["hra.assessmentMethod", "HRA", "Assessment Method", ASSESSMENT_METHOD_OPTIONS],
  ["hra.languageNeedOtherThanEnglish", "HRA", "1. Do you have a language need other than English?"],
  ["hra.needsTranslationServices", "HRA", "Do you need translation services?"],
  ["hra.specialPreferences", "HRA", "2. Do you have any special preferences we should be aware of?", SPECIAL_PREFERENCES_OPTIONS],
  ["hra.healthConditions", "HRA", "3. Do you have any current or past physical and/or behavioral health conditions or diagnoses?", HEALTH_CONDITIONS_OPTIONS],
  ["hra.preferredPronouns", "HRA", "7. What are your preferred pronouns?"],
  ["hra.isPregnant", "HRA", "8. Are you pregnant?"],
  [
    "hra.perinatalPostpartumOrYoungChild",
    "HRA",
    "9. For individuals in the Perinatal/Postpartum population and those with children up to five (5) years of age in the home.",
  ],
  ["hra.usesTobaccoNicotine", "HRA", "10. Do you currently use tobacco and/or nicotine products?"],
  ["hra.interestedInCessationProgram", "HRA", "If yes, are you interested in receiving information on cessation programs?"],
  ["hra.historyOfTobaccoUse", "HRA", "Do you have a history of using tobacco and/or nicotine products?"],
  ["hra.worriedAboutFood", "HRA", "11. Within the past 12 months, have you worried that you would run out of food or that the food you bought would run out?"],
  ["hra.reliableTransportation", "HRA", "12. Do you have reliable transportation? (If no, refer for assistance)"],
  ["hra.needsHelpFindingProvider", "HRA", "13. Do you need help finding a physical or behavioral healthcare provider?"],
  ["hra.erVisitsPast12Months", "HRA", "14. Have you visited the Emergency Room in the past 12 months?"],
  ["hra.erVisitCount", "HRA", "If yes, how many visits?"],
  ["hra.hospitalOvernightPast6Months", "HRA", "15. Have you stayed overnight in the hospital in the past 6 months?"],
  ["hra.readmittedWithin30Days", "HRA", "If yes, were you readmitted within 30 days of discharge?"],
  ["hra.medicationsCount", "HRA", "16. How many medications are you currently taking?"],
  ["hra.currentSituations", "HRA", "17. Are you currently in any of the following situations?", CURRENT_SITUATIONS_OPTIONS],
  ["hra.livingSituation", "HRA", "18. What is your current living situation?", LIVING_SITUATION_OPTIONS],
  ["hra.needsHelpWith2OrMoreAdls", "HRA", "19. Do you need help with 2 or more of the following?"],
  ["hra.adlHelpNeeded", "HRA", "ADL Help Needed options", ADL_HELP_OPTIONS],
  ["hra.hasLivingWillOrAdvanceDirective", "HRA", "20. Do you currently have a living will or an advanced directive in place?"],
  ["hra.wantsMoreAdvanceDirectiveInfo", "HRA", "Would you like more information regarding advanced directives?"],
  ["hra.mainHealthConcerns", "HRA", "21. What are your main health concerns right now?"],
  ["hra.mostSignificantNeedsToday", "HRA", "22. What are your most significant needs today?"],
  ["hra.interestedInCareCoordination", "HRA", "23. Is the Member interested in receiving Care Coordination Services?"],
];

// ---------- Enrollment: CNA ----------

const CNA: Spec[] = [
  ["cna.assessmentMethod", "CNA — Assessment", "Assessment Method", CNA_ASSESSMENT_METHOD_OPTIONS],
  ["cna.assessmentType", "CNA — Assessment", "Assessment Type (check all that apply)", CNA_ASSESSMENT_TYPE_OPTIONS],
  ["cna.hasImminentRisk", "CNA — Assessment", "1. Before beginning, are you experiencing an emergency right now, or thoughts of hurting yourself or someone else?"],
  [
    "cna.meetsCbsqCbma",
    "CNA — Assessment",
    "2. Does the Member meet requirements for a Community Benefits Service Questionnaire (CBSQ)/Community Benefits Member Agreement (CBMA)?",
  ],
  ["cna.languageNeedOtherThanEnglish", "CNA — Assessment", "3. Do you have a language need other than English?"],
  ["cna.needsTranslationServices", "CNA — Assessment", "Do you need translation services?"],
  ["cna.specialPreferences", "CNA — Assessment", "4. Do you have any special preferences we should be aware of?", CNA_SPECIAL_PREFERENCES_OPTIONS],
  ["cna.erVisitsLast12Months", "CNA — Assessment", "5. How many times have you been in the Emergency Room in the last 12 months?", ER_VISITS_OPTIONS],
  ["cna.needsEdAlternativesInfo", "CNA — Assessment", "6. Do you need information on alternatives to the Emergency Department?"],
  ["cna.hospitalStaysLast6Months", "CNA — Assessment", "7. How many times have you been in the hospital in the last 6 months?", HOSPITAL_STAYS_OPTIONS],
  ["cna.waitingForTransplant", "CNA — Assessment", "8. Have you been approved for, or are you waiting for any type of transplant?"],

  ["cna.hasVisionIssues", "CNA — Vision/Hearing/Dental", "9. Do you have any vision issues?"],
  ["cna.lastVisionCheck", "CNA — Vision/Hearing/Dental", "10. When was the last time you had your vision checked?"],
  ["cna.needsEyeCareAppointmentHelp", "CNA — Vision/Hearing/Dental", "11. Do you need any assistance obtaining an eye care professional appointment?"],
  ["cna.hasHearingIssues", "CNA — Vision/Hearing/Dental", "12. Do you have any hearing issues?"],
  ["cna.lastHearingTest", "CNA — Vision/Hearing/Dental", "13. When was the last time you had your hearing tested?"],
  ["cna.needsHearingApptHelp", "CNA — Vision/Hearing/Dental", "14. Do you need any assistance obtaining an appointment with a hearing specialist?"],
  ["cna.lastDentalVisit", "CNA — Vision/Hearing/Dental", "15. When was the last time you had a dental visit?"],
  ["cna.needsDentalApptHelp", "CNA — Vision/Hearing/Dental", "16. Do you need any assistance obtaining a dental appointment?"],

  ["cna.isCurrentlyPregnant", "CNA — Pregnancy", "17. Are you currently pregnant?"],
  ["cna.hadPerinatalCare", "CNA — Pregnancy", "If yes, have they had perinatal care?"],
  ["cna.pregnancyDueDate", "CNA — Pregnancy", "If yes, what is their due date?"],
  ["cna.pregnancyHighRisk", "CNA — Pregnancy", "If yes, have they been told their pregnancy is high risk?"],
  ["cna.needsMaternalProviderHelp", "CNA — Pregnancy", "If yes, do they need assistance finding a Maternal Health Care Provider or scheduling an appointment?"],
  ["cna.pregnantWithinLast12Months", "CNA — Pregnancy", "If no, have they been pregnant within the last 12 months?"],
  ["cna.hadPostpartumDepression", "CNA — Pregnancy", "If yes, have they experienced postpartum depression?"],
  ["cna.timesPregnant", "CNA — Pregnancy", "18. How many times have you been pregnant (including current pregnancy)?"],
  ["cna.viableBirths", "CNA — Pregnancy", "19. How many viable births have you had?"],
  ["cna.historyOfMultipleBirths", "CNA — Pregnancy", "20. Do you have a history of multiple births?"],
  ["cna.everHadCSection", "CNA — Pregnancy", "21. Have you ever had a C-section?"],
  ["cna.priorPregnancyComplications", "CNA — Pregnancy", "22. Have you ever experienced complications during a previous pregnancy or delivery?"],
  ["cna.interestedInHomeVisiting", "CNA — Pregnancy", "23. Is the member interested in being referred to a Maternal Home Visiting program?"],

  ["cna.overallHealthVsYearAgo", "CNA — Physical Health", "How would you describe your overall health compared to a year ago?", OVERALL_HEALTH_OPTIONS],
  ["cna.heightInches", "CNA — Physical Health", "Height (inches)"],
  ["cna.weightLbs", "CNA — Physical Health", "Weight (lbs)"],
  ["cna.hasNonMedicationAllergies", "CNA — Physical Health", "Do you have any known allergies not related to medication?"],
  ["cna.seenProviderLast12Months", "CNA — Physical Health", "Have you seen a healthcare provider in the last 12 months?"],
  ["cna.needsPcpAppointmentHelp", "CNA — Physical Health", "Do you need any assistance obtaining an appointment with a Primary Care Provider, or healthcare provider?"],
  ["cna.hadWellChildVisit", "CNA — Physical Health", "In the last 12 months have you had a well child visit?"],
  ["cna.lastMammogram", "CNA — Physical Health", "When was your last Mammogram?"],
  ["cna.lastPapSmear", "CNA — Physical Health", "When was your last pap smear?"],
  ["cna.hadColorectalScreening", "CNA — Physical Health", "Have you had a colorectal screening?"],
  ["cna.pastSurgeriesProceduresTreatments", "CNA — Physical Health", "What surgeries, procedures, and treatments have you had in the past?"],
  ["cna.upcomingMedicalServices", "CNA — Physical Health", "Do you have any medical appointments, medical tests, surgeries, or other health services planned in the next 3-6 months?"],
  ["cna.needsSchedulingHelp", "CNA — Physical Health", "Do you need help scheduling appointments or procedures?"],
  ["cna.usesOrNeedsDme", "CNA — Physical Health", "Do you use or need Durable Medical Equipment (DME)?"],
  ["cna.needsDmeObtainingHelp", "CNA — Physical Health", "Do you need assistance obtaining needed DME?"],
  ["cna.hasNeurologicalDiagnoses", "CNA — Physical Health", "Do you have any neurological diagnoses such as dementia, epilepsy, or a TBI/ABI?"],
  ["cna.usesTobaccoNicotine", "CNA — Physical Health", "Do you smoke, vape, or chew tobacco?"],
  ["cna.interestedInCessationProgram", "CNA — Physical Health", "If yes, are they interested in a tobacco cessation program?"],

  ["cna.takesMedications", "CNA — Medication", "Do you currently take any prescribed or over the counter medications?"],
  ["cna.ableToObtainAllMedications", "CNA — Medication", "Are you able to obtain all your needed medications?"],
  ["cna.hasDiscontinuedMedications", "CNA — Medication", "Do you have any prescribed or over the counter medications that you are no longer taking?"],
  ["cna.hasMedicationAllergies", "CNA — Medication", "Do you have any known allergies to medications?"],
  ["cna.takesLifeSustainingMedications", "CNA — Medication", "Do you take medications that cannot be stopped or would risk your life if not taken?"],

  ["cna.bhAdmissionsLast12Months", "CNA — Behavioral Health", "In the past 12 months has the Member had any BH emergency/inpatient/residential admissions?"],
  ["cna.lastBhProviderVisit", "CNA — Behavioral Health", "When was the Member's most recent visit to a BH provider?"],
  ["cna.needsBhProviderHelp", "CNA — Behavioral Health", "Does the Member need any assistance obtaining a BH provider or appointment?"],
  ["cna.understandsBhCondition", "CNA — Behavioral Health", "Do you have a good overall understanding of your condition(s)?"],
  ["cna.hasSubstanceUseIssues", "CNA — Behavioral Health", "Do you have any current or past alcohol or substance use issues?"],

  ["cna.phqLittleInterest", "CNA — PHQ-2/PHQ-9", "Little interest or pleasure in doing things?"],
  ["cna.phqFeelingDown", "CNA — PHQ-2/PHQ-9", "Feeling down, depressed, or hopeless?"],
  ["cna.phqTroubleSleeping", "CNA — PHQ-2/PHQ-9", "Trouble falling asleep, staying asleep, or sleeping too much?"],
  ["cna.phqTiredLowEnergy", "CNA — PHQ-2/PHQ-9", "Feeling tired or having little energy?"],
  ["cna.phqAppetite", "CNA — PHQ-2/PHQ-9", "Poor appetite or overeating?"],
  ["cna.phqFeelingBad", "CNA — PHQ-2/PHQ-9", "Feeling bad about yourself — or that you're a failure or have let yourself or your family down?"],
  ["cna.phqTroubleConcentrating", "CNA — PHQ-2/PHQ-9", "Trouble concentrating on things such as reading the newspaper or watching television?"],
  ["cna.phqMovingSpeaking", "CNA — PHQ-2/PHQ-9", "Moving or speaking so slowly that other people could have noticed, or being fidgety/restless?"],
  ["cna.phqSelfHarmThoughts", "CNA — PHQ-2/PHQ-9", "Thoughts that you would be better off dead or hurting yourself in some way?"],
  ["cna.phqDifficultyLevel", "CNA — PHQ-2/PHQ-9", "If you checked off any problems, how difficult have these problems made it for you?", PHQ_DIFFICULTY_OPTIONS],

  ["cna.cageCutDown", "CNA — CAGE", "Have you ever felt you should cut down on your drinking?"],
  ["cna.cageAnnoyed", "CNA — CAGE", "Have people annoyed you by criticizing your drinking?"],
  ["cna.cageGuilty", "CNA — CAGE", "Have you ever felt bad or guilty about your drinking?"],
  ["cna.cageEyeOpener", "CNA — CAGE", "Have you ever had a drink first thing in the morning to steady your nerves or get rid of a hangover?"],

  ["cna.hasHousingInsecurity", "CNA — HRSN", "Do you have any indicators of housing insecurity?"],
  ["cna.livingArrangement", "CNA — HRSN", "Do you live alone or with others?", LIVING_ARRANGEMENT_OPTIONS],
  ["cna.feelsSafeWhereLiving", "CNA — HRSN", "Do you feel physically and emotionally safe where you are living?"],
  ["cna.hasUrgentNeeds", "CNA — HRSN", "Do you have any urgent needs (example: no place to sleep tonight, or feeling unsafe at home)?"],
  ["cna.wantsHousingSpecialistReferral", "CNA — HRSN", "Would you like a referral to our Housing Specialist?"],
  ["cna.householdReceivesCbServices", "CNA — HRSN", "Does anyone in your household receive Community Benefit (CB) services?"],
  ["cna.hasNaturalSupports", "CNA — HRSN", "Do you have any natural supports such as an unpaid family/friend caregiver?"],
  ["cna.naturalSupportMeetsNeeds", "CNA — HRSN", "If yes, do you feel the time spent with the natural support meets your needs?"],
  ["cna.hasPaidCaregiver", "CNA — HRSN", "Do you have a paid caregiver?"],
  ["cna.hasSufficientChildCare", "CNA — HRSN", "Do you have sufficient child care?"],
  ["cna.worriedAboutFood", "CNA — HRSN", "Within the past 12 months, have you worried that you would run out of food?"],
  ["cna.employmentStatus", "CNA — HRSN", "How do you describe your current work situation/employment status?"],
  ["cna.primaryIncomeSource", "CNA — HRSN", "What is your primary source of income?"],
  ["cna.managesFinancesIndependently", "CNA — HRSN", "Are you able to manage financial matters independently?"],
  ["cna.hasLegalIssues", "CNA — HRSN", "Do you have any legal issues?"],
  ["cna.reliableTransportation", "CNA — HRSN", "Do you have reliable transportation?"],
  ["cna.referralsNeeded", "CNA — HRSN", "Do you need help obtaining referrals for:", REFERRAL_NEEDED_OPTIONS],

  ["cna.adlBathingNeeded", "CNA — ADLs", "Bathing"],
  ["cna.adlDressingNeeded", "CNA — ADLs", "Dressing"],
  ["cna.adlGroomingNeeded", "CNA — ADLs", "Grooming"],
  ["cna.adlBowelBladderNeeded", "CNA — ADLs", "Bowel/bladder"],
  ["cna.adlToiletingNeeded", "CNA — ADLs", "Toileting"],
  ["cna.adlEatingNeeded", "CNA — ADLs", "Eating"],
  ["cna.adlMobilityNeeded", "CNA — ADLs", "Mobility assistance"],
  ["cna.adlTransferNeeded", "CNA — ADLs", "Transfer"],
  ["cna.adlMealPrepNeeded", "CNA — ADLs", "Meal preparation and assistance"],
  ["cna.adlDailyMedicationNeeded", "CNA — ADLs", "Daily medication"],

  ["cna.iadlSupportServicesNeeded", "CNA — IADLs", "Support Services"],
  ["cna.iadlDmeMaintenanceNeeded", "CNA — IADLs", "Minor Maintenance of DME"],
  ["cna.iadlLightHousekeepingNeeded", "CNA — IADLs", "Light Housekeeping"],
  ["cna.iadlFinancesNeeded", "CNA — IADLs", "Finances"],
  ["cna.hasFallRiskIndication", "CNA — IADLs", "Do you have any indication of fall risk?"],
  ["cna.needsNfLocEvaluation", "CNA — IADLs", "Does the Member need to be evaluated for a Nursing Facility Level of Care (NF LOC)?"],

  ["cna.mainHealthGoal", "CNA — Summary", "What is your main health goal or outcome you want to achieve?"],
  ["cna.mostSignificantNeedsToday", "CNA — Summary", "What are your most significant needs today?"],
  ["cna.hasAdvanceDirective", "CNA — Summary", "Do you have an advanced directive?"],
  ["cna.wantsAdvanceDirectiveInfo", "CNA — Summary", "If no, would you like more information?"],
  ["cna.interestedInCareCoordination", "CNA — Summary", "Is the member interested in Care Coordination?"],
  ["cna.declinationExplainedAndSigned", "CNA — Summary", "If the member refused Care Coordination: Was the HCA approved Declination explained and signed?"],
  ["cna.declinationReason", "CNA — Summary", "What was the reason for refusal?"],
];

// ---------- Enrollment: Care Coordination Notes ----------

const CCN: Spec[] = [
  ["ccn.physicalHealthSummary", "Care Coordination Notes", "1. Provide a summary of the Member's Physical Health (PH)"],
  ["ccn.behavioralHealthSummary", "Care Coordination Notes", "2. Provide a summary of the Member's Behavioral Health (BH)"],
  ["ccn.safetyVisionHearingCaregiverObservations", "Care Coordination Notes", "3. Provide overall, objective observations of safety/vision/hearing/caregiver needs"],
  ["ccn.hrsnAndAdditionalObservations", "Care Coordination Notes", "Member's HRSN needs, and any additional observations"],
  ["ccn.communityProviderReferrals", "Care Coordination Notes", "4. What community/provider referrals were needed and/or provided to the member?"],
  ["ccn.schedulingAssistanceProvided", "Care Coordination Notes", "5. What assistance was needed and/or provided to the member in scheduling appointments?"],
  ["ccn.ccl1Criteria", "Care Coordination Notes", "CCL1 Criteria (checklist)", CCL1_CRITERIA_OPTIONS],
  ["ccn.ccl2Criteria", "Care Coordination Notes", "CCL2 Criteria (checklist)", CCL2_CRITERIA_OPTIONS],
  ["ccn.cannotBeLeveledDownIndicators", "Care Coordination Notes", "Cannot Be Leveled Down Indicators (checklist)", CANNOT_BE_LEVELED_DOWN_OPTIONS],
  ["ccn.careCoordinationLevel", "Care Coordination Notes", "7. What is the Member's identified Care Coordination Level?", CARE_COORDINATION_LEVEL_OPTIONS],
  ["ccn.eligibilityConclusionsSummary", "Care Coordination Notes", "8. Summarize the care coordinator's conclusions about the Member's eligibility and access to community resources"],
  ["ccn.cbsqCbmaCompleted", "Care Coordination Notes", "9. Were the CBSQ and CBMA completed?"],
  ["ccn.hasCoe100Abp", "Care Coordination Notes", "10. Does the member have a COE 100 ABP?"],
  ["ccn.wantsAbpExemptEvaluation", "Care Coordination Notes", "Does the member want to be evaluated for ABP exempt?"],
  ["ccn.abpClassification", "Care Coordination Notes", "ABP Classification options", ABP_CLASSIFICATION_OPTIONS],
  ["ccn.qualifiesForAbpExempt", "Care Coordination Notes", "11. Does the member qualify for ABP exempt?"],
  ["ccn.hcbsSettingsRuleAssessed", "Care Coordination Notes", "12. Has the care coordinator assessed the Member's living arrangement for HCBS settings rule compliance?"],
  ["ccn.providedServicesBenefitsInfo", "Care Coordination Notes", "13. Member was provided with information on all available services and benefits."],
  ["ccn.memberSatisfactionDescription", "Care Coordination Notes", "14. Describe the member's satisfaction with services and care."],
  ["ccn.complexCaseManagementOrNfloc", "Care Coordination Notes", "15. Is the Member being assessed for Complex Case Management or considered for initial NFLOC?", COMPLEX_CASE_OPTIONS],
];

// ---------- CCP: Comprehensive Care Plan, General Communication, Goals ----------

const CCP: Spec[] = [
  ["ccp.ccpStartDate", "CCP", "CCP Start Date"],
  ["ccp.mostRecentCnaCompletionDate", "CCP", "Most Recent CNA Completion Date"],
  ["ccp.preferredContactMethod", "CCP", "Preferred Method of Contact", PREFERRED_CONTACT_METHOD_OPTIONS],
  ["ccp.servicesAuthorizedByMco", "CCP", "Services that will be Authorized by the MCO"],
  ["ccp.phBhConditions", "CCP", "Physical Health (PH) and Behavioral Health (BH) Conditions/Diagnoses"],
  ["ccp.backupPlanText", "CCP", "Backup plan if caregiver(s) don't show up"],
  ["ccp.disasterPlanText", "CCP", "Natural disaster / emergency preparedness / evacuation plan"],
  ["ccp.disasterReviewItems", "CCP", "Review needed items to take (checklist)", DISASTER_REVIEW_ITEMS_OPTIONS],
  ["ccp.otherServicesText", "CCP", "Other non-covered services provided to the Member"],
  ["ccp.dualEligibleInfoNeeded", "CCP", "Dual Eligible — information/assistance needed/provided"],
  ["ccp.otherContactSchedule", "CCP", "Other contact schedule requested by Member"],
  ["ccp.cbSettingsChoice", "CCP", "Member's Choice of Community Benefit Settings and Providers"],
  ["ccp.mcoIntegrationPlan", "CCP", "Describe MCO plan to ensure member has opportunities for Community Integration"],
  ["ccp.priority", "CCP Goals", "Priority", GOAL_PRIORITY_OPTIONS],
  ["ccp.opportunity", "CCP Goals", "Opportunity"],
  ["ccp.strengths", "CCP Goals", "Strengths"],
  ["ccp.barriers", "CCP Goals", "Barriers"],
  ["ccp.goalText", "CCP Goals", "Goal"],
  ["ccp.memberActionText", "CCP Goals", "Action I will take to achieve this goal (Member)"],
  ["ccp.coordinatorActionText", "CCP Goals", "Action my care coordinator will take to help me achieve this goal"],

  ["generalComm.contactMethod", "General Communication", "Contact Method", CONTACT_METHOD_OPTIONS],
  ["generalComm.personContacted", "General Communication", "Person Contacted", PERSON_CONTACTED_OPTIONS],
  ["generalComm.unsuccessfulReason", "General Communication", "If unsuccessful, reason", UNSUCCESSFUL_REASON_OPTIONS],
];

// ---------- TOC: Transition of Care ----------

const TOC: Spec[] = [
  ["toc.mcoNotificationDate", "TOC", "Date of MCO Notification of Transition"],
  ["toc.tocPlanStartDate", "TOC", "TOC Plan Start Date"],
  ["toc.tocPlanCompletionDate", "TOC", "TOC Plan Completion Date"],
  ["toc.transitionType", "TOC", "Transition Type", TRANSITION_TYPE_OPTIONS],
  ["toc.dcTeamContactSummary", "TOC", "Summary of contact attempts with Discharge (D/C) Planning Team"],
];

// Every numbered "need" item across TOC sections 2, 3, 4, 6, 7, 8 — generated
// from the same config the form renders from (components/toc/needs-config.ts),
// so this always matches exactly what's on the page with no hand-transcription.
const TOC_NEEDS: Spec[] = TOC_NEEDS_SECTIONS.flatMap((section) =>
  section.needs.map((need): Spec => [`toc.need.${section.section}.${need.key}`, `TOC — ${section.title}`, need.label])
);

// Fields where a specific value (or the field's presence at all) drives
// required-assessment, safety-flag, or clinical-score logic elsewhere in the
// app — see lib/hra-cna-required.ts and lib/cna-computed.ts. These stay
// reword-able but can't be retired from the form, and where noted, specific
// option values can't be removed from their list (enforced in
// app/actions/form-fields.ts).
export const PROTECTED_FIELDS = new Set<string>([
  // CNA-required triggers (lib/hra-cna-required.ts)
  "hra.healthConditions",
  "hra.currentSituations",
  "hra.livingSituation",
  "hra.isPregnant",
  "hra.erVisitCount",
  "hra.readmittedWithin30Days",
  "hra.medicationsCount",
  "hra.needsHelpWith2OrMoreAdls",
  "hra.interestedInCareCoordination",
  // CNA safety-concern banner (lib/cna-computed.ts getSafetyConcernReasons)
  "cna.hasImminentRisk",
  "cna.hasUrgentNeeds",
  // PHQ-9 depression screen — standardized clinical scale (lib/cna-computed.ts)
  "cna.phqLittleInterest",
  "cna.phqFeelingDown",
  "cna.phqTroubleSleeping",
  "cna.phqTiredLowEnergy",
  "cna.phqAppetite",
  "cna.phqFeelingBad",
  "cna.phqTroubleConcentrating",
  "cna.phqMovingSpeaking",
  "cna.phqSelfHarmThoughts",
  // CAGE substance-use screen — standardized clinical scale
  "cna.cageCutDown",
  "cna.cageAnnoyed",
  "cna.cageGuilty",
  "cna.cageEyeOpener",
  // BMI calculation
  "cna.heightInches",
  "cna.weightLbs",
  // Feeds the patient roster table, CSV export, and Annual CNA Status report
  "cna.assessmentType",
  "demographics.medicaidEligibilityRenewalDate",
]);

// Values within a protected field's option list that must stay present —
// removing them would silently break the required-assessment check that
// matches against them by exact string.
export const PROTECTED_OPTIONS: Record<string, string[]> = {
  "hra.healthConditions": ["None"],
  "hra.livingSituation": LIVING_SITUATION_CNA_REQUIRED,
};

export const FORM_FIELD_REGISTRY: FormFieldDef[] = [
  ...expand(DEMOGRAPHICS, "enrollment"),
  ...expand(HRA, "enrollment"),
  ...expand(CNA, "enrollment"),
  ...expand(CCN, "enrollment"),
  ...expand(CCP, "ccp"),
  ...expand(TOC, "toc"),
  ...expand(TOC_NEEDS, "toc"),
];

export type ResolvedField = { label: string; options: string[]; hidden: boolean };
export type ResolvedFormFields = Record<string, ResolvedField>;

export function getFieldDef(key: string): FormFieldDef | undefined {
  return FORM_FIELD_REGISTRY.find((f) => f.key === key);
}
