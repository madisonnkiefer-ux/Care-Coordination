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
import { TRANSITION_TYPE_OPTIONS } from "@/components/toc/needs-config";

// Every dropdown/checkbox field an office admin can re-word from Settings →
// Form Content when the state revises one of the standardized forms. Not
// every option list on these forms is here — a handful drive required-field
// logic (see PROTECTED_OPTIONS below) or mirror the state's exact numbered
// question wording, and stay code-only on purpose. Adding a field here only
// changes what shows up in the editor; it still needs a matching call site
// in the form component reading from the resolved `fields` map.
export type FormFieldDef = {
  key: string;
  form: "enrollment" | "ccp" | "toc";
  section: string;
  name: string;
  // Whether `name`/the override label is actually rendered as this field's
  // on-page label. False for fields whose on-page text is the state form's
  // exact numbered question wording — that stays fixed, only its option
  // list is editable here.
  labelEditable: boolean;
  defaultOptions: string[];
};

export const FORM_FIELD_REGISTRY: FormFieldDef[] = [
  // Enrollment — Demographics (and shared with HRA, see below)
  { key: "demographics.ethnicity", form: "enrollment", section: "Demographics", name: "Ethnicity", labelEditable: true, defaultOptions: ETHNICITY_OPTIONS },
  { key: "demographics.race", form: "enrollment", section: "Demographics", name: "Race", labelEditable: true, defaultOptions: RACE_OPTIONS },
  {
    key: "shared.sexAssignedAtBirth",
    form: "enrollment",
    section: "Demographics",
    name: "Sex Assigned at Birth (also used on the HRA)",
    labelEditable: true,
    defaultOptions: SEX_ASSIGNED_AT_BIRTH_OPTIONS,
  },
  {
    key: "shared.currentGender",
    form: "enrollment",
    section: "Demographics",
    name: "Current Gender (also used on the HRA)",
    labelEditable: true,
    defaultOptions: CURRENT_GENDER_OPTIONS,
  },
  {
    key: "shared.sexualIdentity",
    form: "enrollment",
    section: "Demographics",
    name: "Current Sexual Identity (also used on the HRA)",
    labelEditable: true,
    defaultOptions: SEXUAL_IDENTITY_OPTIONS,
  },

  // Enrollment — HRA
  { key: "hra.assessmentType", form: "enrollment", section: "HRA", name: "Assessment Type", labelEditable: true, defaultOptions: ASSESSMENT_TYPE_OPTIONS },
  {
    key: "hra.assessmentMethod",
    form: "enrollment",
    section: "HRA",
    name: "Assessment Method",
    labelEditable: true,
    defaultOptions: ASSESSMENT_METHOD_OPTIONS,
  },
  {
    key: "hra.specialPreferences",
    form: "enrollment",
    section: "HRA",
    name: "Special Preferences (Q2 options)",
    labelEditable: false,
    defaultOptions: SPECIAL_PREFERENCES_OPTIONS,
  },
  {
    key: "hra.healthConditions",
    form: "enrollment",
    section: "HRA",
    name: "Health Conditions (Q3 options)",
    labelEditable: false,
    defaultOptions: HEALTH_CONDITIONS_OPTIONS,
  },
  {
    key: "hra.currentSituations",
    form: "enrollment",
    section: "HRA",
    name: "Current Situations (Q17 options)",
    labelEditable: false,
    defaultOptions: CURRENT_SITUATIONS_OPTIONS,
  },
  {
    key: "hra.livingSituation",
    form: "enrollment",
    section: "HRA",
    name: "Living Situation (Q18 options)",
    labelEditable: false,
    defaultOptions: LIVING_SITUATION_OPTIONS,
  },
  {
    key: "hra.adlHelp",
    form: "enrollment",
    section: "HRA",
    name: "ADL Help Needed (Q19 options)",
    labelEditable: false,
    defaultOptions: ADL_HELP_OPTIONS,
  },

  // Enrollment — CNA
  {
    key: "cna.assessmentMethod",
    form: "enrollment",
    section: "CNA",
    name: "Assessment Method",
    labelEditable: true,
    defaultOptions: CNA_ASSESSMENT_METHOD_OPTIONS,
  },
  {
    key: "cna.assessmentType",
    form: "enrollment",
    section: "CNA",
    name: "Assessment Type (check all that apply)",
    labelEditable: false,
    defaultOptions: CNA_ASSESSMENT_TYPE_OPTIONS,
  },
  {
    key: "cna.specialPreferences",
    form: "enrollment",
    section: "CNA",
    name: "Special Preferences options",
    labelEditable: false,
    defaultOptions: CNA_SPECIAL_PREFERENCES_OPTIONS,
  },
  { key: "cna.erVisits", form: "enrollment", section: "CNA", name: "ER Visits options", labelEditable: false, defaultOptions: ER_VISITS_OPTIONS },
  {
    key: "cna.hospitalStays",
    form: "enrollment",
    section: "CNA",
    name: "Hospital Stays options",
    labelEditable: false,
    defaultOptions: HOSPITAL_STAYS_OPTIONS,
  },
  {
    key: "cna.overallHealth",
    form: "enrollment",
    section: "CNA",
    name: "Overall Health options",
    labelEditable: false,
    defaultOptions: OVERALL_HEALTH_OPTIONS,
  },
  {
    key: "cna.livingArrangement",
    form: "enrollment",
    section: "CNA",
    name: "Living Arrangement options",
    labelEditable: false,
    defaultOptions: LIVING_ARRANGEMENT_OPTIONS,
  },
  {
    key: "cna.referralsNeeded",
    form: "enrollment",
    section: "CNA",
    name: "Referrals Needed options",
    labelEditable: false,
    defaultOptions: REFERRAL_NEEDED_OPTIONS,
  },
  {
    key: "cna.phqDifficulty",
    form: "enrollment",
    section: "CNA",
    name: "PHQ-9 Difficulty Level options",
    labelEditable: false,
    defaultOptions: PHQ_DIFFICULTY_OPTIONS,
  },

  // Enrollment — Care Coordination Notes
  {
    key: "ccn.ccl1Criteria",
    form: "enrollment",
    section: "Care Coordination Notes",
    name: "CCL1 Criteria (checklist)",
    labelEditable: false,
    defaultOptions: CCL1_CRITERIA_OPTIONS,
  },
  {
    key: "ccn.ccl2Criteria",
    form: "enrollment",
    section: "Care Coordination Notes",
    name: "CCL2 Criteria (checklist)",
    labelEditable: false,
    defaultOptions: CCL2_CRITERIA_OPTIONS,
  },
  {
    key: "ccn.cannotBeLeveledDown",
    form: "enrollment",
    section: "Care Coordination Notes",
    name: "Cannot Be Leveled Down Indicators (checklist)",
    labelEditable: false,
    defaultOptions: CANNOT_BE_LEVELED_DOWN_OPTIONS,
  },
  {
    key: "ccn.careCoordinationLevel",
    form: "enrollment",
    section: "Care Coordination Notes",
    name: "Care Coordination Level options",
    labelEditable: false,
    defaultOptions: CARE_COORDINATION_LEVEL_OPTIONS,
  },
  {
    key: "ccn.abpClassification",
    form: "enrollment",
    section: "Care Coordination Notes",
    name: "ABP Classification options",
    labelEditable: false,
    defaultOptions: ABP_CLASSIFICATION_OPTIONS,
  },
  {
    key: "ccn.complexCase",
    form: "enrollment",
    section: "Care Coordination Notes",
    name: "Complex Case options",
    labelEditable: false,
    defaultOptions: COMPLEX_CASE_OPTIONS,
  },

  // CCP
  {
    key: "ccp.preferredContactMethod",
    form: "ccp",
    section: "CCP",
    name: "Preferred Method of Contact options",
    labelEditable: false,
    defaultOptions: PREFERRED_CONTACT_METHOD_OPTIONS,
  },
  {
    key: "ccp.disasterReviewItems",
    form: "ccp",
    section: "CCP",
    name: "Disaster Review Items (checklist)",
    labelEditable: false,
    defaultOptions: DISASTER_REVIEW_ITEMS_OPTIONS,
  },
  { key: "ccp.goalPriority", form: "ccp", section: "CCP", name: "Priority", labelEditable: true, defaultOptions: GOAL_PRIORITY_OPTIONS },
  {
    key: "generalComm.contactMethod",
    form: "ccp",
    section: "General Communication",
    name: "Contact Method",
    labelEditable: true,
    defaultOptions: CONTACT_METHOD_OPTIONS,
  },
  {
    key: "generalComm.personContacted",
    form: "ccp",
    section: "General Communication",
    name: "Person Contacted",
    labelEditable: true,
    defaultOptions: PERSON_CONTACTED_OPTIONS,
  },
  {
    key: "generalComm.unsuccessfulReason",
    form: "ccp",
    section: "General Communication",
    name: "If unsuccessful, reason",
    labelEditable: true,
    defaultOptions: UNSUCCESSFUL_REASON_OPTIONS,
  },

  // TOC
  { key: "toc.transitionType", form: "toc", section: "TOC", name: "Transition Type", labelEditable: true, defaultOptions: TRANSITION_TYPE_OPTIONS },
];

// Fields where a specific value must stay in the list — removing it would
// silently break required-field logic elsewhere (see lib/hra-cna-required.ts).
// Enforced in app/actions/form-fields.ts; admins can still add new options
// or reorder freely, they just can't drop these.
export const PROTECTED_OPTIONS: Record<string, string[]> = {
  "hra.healthConditions": ["None"],
  "hra.livingSituation": LIVING_SITUATION_CNA_REQUIRED,
};

export type ResolvedField = { label: string; options: string[] };
export type ResolvedFormFields = Record<string, ResolvedField>;

export function getFieldDef(key: string): FormFieldDef | undefined {
  return FORM_FIELD_REGISTRY.find((f) => f.key === key);
}
