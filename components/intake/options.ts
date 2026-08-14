export const ETHNICITY_OPTIONS = ["Hispanic or Latino", "Not Hispanic or Latino", "Unknown/Declined"];
export const RACE_OPTIONS = [
  "White or Caucasian",
  "Black or African American",
  "Asian",
  "American Indian or Alaska Native",
  "Native Hawaiian or Other Pacific Islander",
  "Two or More Races",
  "A race/ethnicity not listed",
  "Unknown/Declined",
];

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

// lib/hra-cna-required.ts parses this with parseInt, so "6 or more" still
// correctly trips the >= 6 CNA-required rule.
export const MEDICATIONS_COUNT_OPTIONS = ["0", "1", "2", "3", "4", "5", "6 or more"];

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

// Care Coordination Notes — leveling criteria, from the standardized CNA's
// "Care Coordination Engagement" section.
export const CCL1_CRITERIA_OPTIONS = [
  "CCL1 (at minimum)",
  "Members who meet NF LOC or are receiving Long Term Services and Supports (LTSS)",
  "Perinatal/Postpartum Members",
  "Member engaged in Medicaid Home Visiting (MHV) (1 year postpartum)",
  "Waiver Member",
  "Member with three or more complaints, grievances, or appeals related to the Member's experience with the service delivery system",
  "Behavioral Health diagnosis (non-SUD/SMI/SED)",
  "Frequent emergency room use with four or more annual individual patient visits",
  "Has an acute disease, as defined by the MCO",
  "Justice Involved (13 months post release)",
  "Member has housing insecurity",
  "Readmitted to the hospital within thirty (30) Calendar Days of discharge",
  "Has Dementia, mild or more significant cognitive deficits requiring prompting or cueing",
  "Has poly-pharmaceutical use, defined as simultaneous use of six (6) or more medications from different drug classes and/or simultaneous use of three (3) or more medications from the same drug class",
];

export const CCL2_CRITERIA_OPTIONS = [
  "CCL2",
  "Is a dependent child in an out-of-home placement",
  "High Cost Member",
  "Member with Substance Use Disorder (SUD)",
  "Member with serious Emotional Disturbance (SED)",
  "Member with serious mental illness (SMI)",
  "Justice-Involved Member who have been incarcerated within the last year",
  "Members who are homeless",
  "Member has a TBI",
  "Children in State Custody (CISC) Member",
  "CARA Member",
  "Member is in an out of state placement",
  "Medically Fragile Member",
  "Is a transplant recipient",
  "Is residing in an ICF/IID",
  "Multi-comorbidity",
  "Terminal Disease",
  "Medically Frail",
];

export const CANNOT_BE_LEVELED_DOWN_OPTIONS = [
  "095 and 096",
  "CISC Members",
  "CARA Members",
  "Members with four or more annual individual emergency department or inpatient visits",
  "Members defined as high cost need",
  "Members with a Nursing Facility Level of Care",
  "Members in and out of State Placement",
  "Members who have been incarcerated in the last year",
  "Members who are homeless",
  "Perinatal or maternal health member or member engaged in maternal home visiting MHV",
];

export const CARE_COORDINATION_LEVEL_OPTIONS = ["CCL0", "CCL1", "CCL2", "Initial Not Otherwise Medicaid Eligible (NOME)"];
export const ABP_CLASSIFICATION_OPTIONS = ["ABP", "ABP Exempt", "N/A"];
export const COMPLEX_CASE_OPTIONS = ["Initial NFLOC", "Complex Case Management", "N/A"];

// Comprehensive Care Plan (CCP) — from the standardized HCA form (MAD 866).
export const PREFERRED_CONTACT_METHOD_OPTIONS = ["Voice", "Text", "Mail", "Email"];

export const DISASTER_REVIEW_ITEMS_OPTIONS = [
  "Medication/drugs",
  "Oxygen tank/concentrator",
  "Nebulizer and attachments",
  "Wound care supplies",
  "Catheters/supplies",
  "Feeding tube supplies",
  "Identification (ID) cards and valuable papers",
  "Special food",
  "Clothing",
  "Purse/wallet",
  "Medical summary",
  "Names/contact information of providers",
  "Other",
];

export const GOAL_PRIORITY_OPTIONS = ["High Priority", "Medium Priority", "Low Priority"];
