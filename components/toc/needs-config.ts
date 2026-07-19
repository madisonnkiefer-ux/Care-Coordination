// Sections 2, 3, 4, 6, 7, and 8 of the standardized TOC form (MAD 868) are
// all the same "Needs | Actions" table shape with a fixed list of numbered
// needs. Defined once here and rendered generically by <NeedsSection> so we
// don't hand-write ~60 nearly-identical form blocks.
export type NeedItem = { key: string; label: string };
export type NeedsSectionConfig = {
  section: number;
  title: string;
  subtitle: string;
  needs: NeedItem[];
};

export function needFieldName(section: number, key: string, field: "status" | "actions") {
  return `need-${section}-${key}-${field}`;
}

export const TOC_NEEDS_SECTIONS: NeedsSectionConfig[] = [
  {
    section: 2,
    title: "2. Coordination with Discharge (D/C) Planning Team",
    subtitle:
      "Only completed/populated into the TOC plan for Members discharging from a facility. If the D/C planning team was not reached, enter \"None\" for each need below.",
    needs: [
      { key: "hcbs", label: "Need for Home and Community Based Services" },
      { key: "followUpAppointments", label: "Follow-up appointments" },
      { key: "therapiesTreatments", label: "Therapies and treatments" },
      { key: "medications", label: "Medications" },
      { key: "dme", label: "Durable Medical Equipment (DME)" },
    ],
  },
  {
    section: 3,
    title: "3. Transition of Care (TOC) Assessment/Plan",
    subtitle: "Not completed for Members Turning 21. Only populates into the TOC plan provided to the Member if completed.",
    needs: [
      { key: "physicalHealth", label: "Physical Health (PH)" },
      { key: "behavioralHealth", label: "Behavioral Health (BH)" },
      { key: "communityBenefits", label: "Community Benefits" },
      { key: "medicaidEligibility", label: "Continuation of Medicaid eligibility" },
      { key: "phbhProviders", label: "PH/BH providers" },
      { key: "communityResourceProviders", label: "Community resource providers" },
      { key: "housing", label: "Housing" },
      { key: "financial", label: "Financial" },
      { key: "interpersonalSkills", label: "Interpersonal skills" },
      { key: "safety", label: "Safety" },
    ],
  },
  {
    section: 4,
    title: "4. 3-Day Post-Discharge In-Home Assessment",
    subtitle:
      "Only for Members requiring a 3-Day Post-Discharge In-Home Assessment (transitioning from inpatient hospital or NF stay who may be in need of Community Benefits).",
    needs: [
      { key: "safetyHome", label: "Safety in the home environment" },
      { key: "physicalHealthNeeds", label: "Physical Health Needs" },
      { key: "behavioralHealthNeeds", label: "Behavioral Health Needs" },
      { key: "housingNeeds", label: "Housing Needs" },
      { key: "medicaidEligibilityCont", label: "Continuation of Medicaid Eligibility" },
      { key: "financialNeeds", label: "Financial Needs" },
      { key: "cnaIfNotInPlace", label: "CNA if one is not in place" },
      { key: "communityBenefitNeeds", label: "Community Benefit needs and services in place" },
    ],
  },
  {
    section: 6,
    title: "6. Transition for Members Turning 21",
    subtitle: "Only for Members Turning 21.",
    needs: [
      { key: "healthConditionMgmt", label: "Health condition management" },
      { key: "developmentalIndependence", label: "Developmental and functional independence" },
      { key: "education", label: "Education" },
      { key: "socialEmotionalHealth", label: "Social and emotional health" },
      { key: "continuityBhServices", label: "Continuity of BH services (if requested)" },
      { key: "guardianship", label: "Guardianship (if applicable)" },
      { key: "transportation", label: "Transportation" },
      { key: "epsdt", label: "EPSDT services and provider needs" },
    ],
  },
  {
    section: 7,
    title: "7. Transition for Members Graduating from CARA",
    subtitle: "Only for CARA Members.",
    needs: [
      { key: "physicalHealth", label: "Physical Health (PH)" },
      { key: "behavioralHealth", label: "Behavioral Health (BH)" },
      { key: "wellCareVisits", label: "Well care visits" },
      { key: "developmentalMilestones", label: "Developmental and functional milestones" },
      { key: "cyfdInvolvement", label: "CYFD involvement" },
      { key: "currentPlacement", label: "Current placement" },
      { key: "phbhProviders", label: "PH/BH providers" },
      { key: "educationParentGuardian", label: "Education for parent/guardian" },
      { key: "dmeServiceNeeds", label: "DME/service needs" },
      { key: "communityResources", label: "Community resources" },
      { key: "guardianship", label: "Guardianship (if applicable)" },
    ],
  },
  {
    section: 8,
    title: "8. Transition for CISC 066/086 Members",
    subtitle: "Only for CISC Members.",
    needs: [
      { key: "physicalHealth", label: "Physical Health (PH)" },
      { key: "behavioralHealth", label: "Behavioral Health (BH)" },
      { key: "wellCareVisits", label: "Well care visits" },
      { key: "developmentalMilestones", label: "Developmental and functional milestones" },
      { key: "cyfdInvolvement", label: "CYFD involvement" },
      { key: "currentPlacementPermanency", label: "Current placement and permanency plan" },
      { key: "phbhProviders", label: "PH/BH providers" },
      { key: "educationParentGuardian", label: "Education for parent/guardian" },
      { key: "dmeServiceNeeds", label: "DME/service needs" },
      { key: "communityResources", label: "Community resources" },
      { key: "guardianship", label: "Guardianship (if applicable)" },
      { key: "transitioningNewMco", label: "Transitioning to a new MCO (if applicable)" },
    ],
  },
];

export const TRANSITION_TYPE_OPTIONS = [
  "Nursing Facility (NF) — Higher to lower Level of Care (LOC)",
  "Acute inpatient (IP)",
  "Residential Treatment Center (RTC)",
  "Social detoxification program",
  "Treatment Foster Care (TFC)",
  "Turning 21 (complete sections 1, 5, and 6 only)",
  "Substance exposed infants: 60 days prior to graduation from CARA program (complete sections 1, 2, 5, and 7 only)",
  "CISC 066/086 Members (sections 1, 2, 5, and 8 only)",
  "Other",
];
