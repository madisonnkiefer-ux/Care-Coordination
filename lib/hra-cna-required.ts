import type { HraAssessment } from "@/app/generated/prisma/client";
import { LIVING_SITUATION_CNA_REQUIRED } from "@/components/intake/options";

// Mirrors the "CNA Required for Items in BLUE" markers on the standardized
// HRA form — a positive answer on any of these items means a Comprehensive
// Needs Assessment must be completed.
export function getCnaRequiredReasons(hra: Partial<HraAssessment>): string[] {
  const reasons: string[] = [];

  if (hra.healthConditions && hra.healthConditions !== "None") {
    reasons.push(`Health condition reported: ${hra.healthConditions}`);
  }
  if (hra.isPregnant === true) {
    reasons.push("Member is pregnant");
  }
  const erCount = parseInt(hra.erVisitCount ?? "", 10);
  if (!Number.isNaN(erCount) && erCount >= 4) {
    reasons.push(`${erCount} ER visits in the past 12 months`);
  }
  if (hra.readmittedWithin30Days === true) {
    reasons.push("Readmitted to the hospital within 30 days of discharge");
  }
  const medCount = parseInt(hra.medicationsCount ?? "", 10);
  if (!Number.isNaN(medCount) && medCount >= 6) {
    reasons.push(`Taking ${medCount} medications`);
  }
  if (hra.currentSituations) {
    reasons.push(`Current situation: ${hra.currentSituations}`);
  }
  if (hra.livingSituation && LIVING_SITUATION_CNA_REQUIRED.includes(hra.livingSituation)) {
    reasons.push(`Living situation: ${hra.livingSituation}`);
  }
  if (hra.needsHelpWith2OrMoreAdls === true) {
    reasons.push("Needs help with 2 or more activities of daily living");
  }
  if (hra.interestedInCareCoordination === true) {
    reasons.push("Interested in Care Coordination Services");
  }

  return reasons;
}
