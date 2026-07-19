// Canonical option lists from the standardized HCA Health Risk Assessment —
// shared by Demographics and HRA since both ask these same three questions.
export const SEX_ASSIGNED_AT_BIRTH_OPTIONS = ["Male", "Female", "X or intersex", "Decline/prefer not to answer"];

export const CURRENT_GENDER_OPTIONS = [
  "Male",
  "Female",
  "Transgender Man",
  "Transgender Woman",
  "Non-binary",
  "Other",
  "Decline/prefer not to answer",
  "N/A",
];

export const SEXUAL_IDENTITY_OPTIONS = [
  "Gay or lesbian",
  "Straight, that is not gay or lesbian",
  "Bisexual",
  "Other",
  "Decline/prefer not to answer",
  "N/A",
];

// HRA-specific option lists, also from the standardized HCA form.
export const ASSESSMENT_TYPE_OPTIONS = ["Initial assessment", "Change in health status"];
export const ASSESSMENT_METHOD_OPTIONS = ["Telephonic", "In-person", "Other"];

export const SPECIAL_PREFERENCES_OPTIONS = [
  "Cultural preference",
  "Hearing Impairment",
  "Literacy",
  "Religion/spiritual needs or preferences",
  "Visual Impairment",
  "None",
  "Other",
];

// CNA required for every option here except "None" — see getCnaRequiredReasons.
export const HEALTH_CONDITIONS_OPTIONS = [
  "Behavioral health diagnosis",
  "Substance Use Disorder (SUD)",
  "Comorbid conditions",
  "Residing in an Intermediate Care Facility for Individuals with Intellectual Disabilities (ICF/IID)",
  "Transplant patient",
  "Medically Fragile Waiver Program",
  "Other Waiver Program",
  "Medically Frail",
  "Traumatic Brain Injury/Acquired Brain Injury (TBI/ABI)",
  "Dementia/cognitive deficits",
  "Other acute or terminal disease",
  "Other chronic condition",
  "None",
];

// CNA required for any selection here.
export const CURRENT_SITUATIONS_OPTIONS = ["Justice involved", "Children, Youth, and Families Department (CYFD) custody"];

export const LIVING_SITUATION_OPTIONS = [
  "Living alone",
  "Living with family/spouse",
  "Living with others unrelated",
  "Homeless",
  "Living in shelter",
  "Living in group home",
  "Lives in out of state facility",
  "Dependent child in out of home placement",
  "Living in a nursing facility",
  "Living in assisted living facility",
  "Other",
];

// CNA required if livingSituation is one of these.
export const LIVING_SITUATION_CNA_REQUIRED = ["Homeless", "Living in shelter", "Lives in out of state facility", "Dependent child in out of home placement"];

export const ADL_HELP_OPTIONS = [
  "Bathing",
  "Dressing",
  "Grooming",
  "Toileting",
  "Transfer",
  "Bowel/bladder",
  "Eating",
  "Mobility assistance",
  "Meal preparation",
  "Daily medication",
  "Light housekeeping",
  "Other",
];

// CNA-specific option lists, from the standardized HCA Comprehensive Needs Assessment (MAD 867).
export const CNA_ASSESSMENT_TYPE_OPTIONS = ["Initial", "Annual", "Semi-Annual", "Change in Condition", "Treat First"];
export const CNA_ASSESSMENT_METHOD_OPTIONS = [
  "In-person in-home",
  "In-person (alternate location exception approved)",
  "Telephonic (exception approved)",
  "Video (exception approved)",
];

export const CNA_SPECIAL_PREFERENCES_OPTIONS = ["Cultural preference", "Literacy", "Religion/spiritual needs or preferences", "None", "Other"];

export const ER_VISITS_OPTIONS = ["0", "1", "2", "3", "4 or more", "unknown"];
export const HOSPITAL_STAYS_OPTIONS = ["0", "1", "2", "3 or more"];

export const OVERALL_HEALTH_OPTIONS = ["Excellent", "Good", "Fair", "Poor"];

export const LIVING_ARRANGEMENT_OPTIONS = ["Alone", "With others"];

export const REFERRAL_NEEDED_OPTIONS = ["Housing", "Caregiver support", "Childcare support", "Food", "Employment", "Transportation", "Financial/Legal", "Utilities"];

export const PHQ_SCALE_OPTIONS = [
  { value: 0, label: "0 — Not at all" },
  { value: 1, label: "1 — Several days" },
  { value: 2, label: "2 — More than half the days" },
  { value: 3, label: "3 — Nearly every day" },
];

export const PHQ_DIFFICULTY_OPTIONS = ["Not difficult at all", "Somewhat difficult", "Very difficult", "Extremely difficult"];
