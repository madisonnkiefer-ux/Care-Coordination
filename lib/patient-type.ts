// Member.program's fixed set of values. touchpoint-compliance.ts compares
// against "Prenatal"/"Postpartum" literally, so those stored values can't
// change even though the dropdown label reads "Pre-natal".
export const PATIENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "Prenatal", label: "Pre-natal" },
  { value: "Postpartum", label: "Postpartum" },
  { value: "GYN", label: "GYN" },
];
