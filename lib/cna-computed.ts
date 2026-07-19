import type { CnaAssessment } from "@/app/generated/prisma/client";

export function computeBmi(heightInches?: string | null, weightLbs?: string | null): number | null {
  const height = parseFloat(heightInches ?? "");
  const weight = parseFloat(weightLbs ?? "");
  if (!height || !weight || Number.isNaN(height) || Number.isNaN(weight)) return null;
  return Math.round(((weight / (height * height)) * 703) * 10) / 10;
}

export function computePhq2Total(cna: Partial<CnaAssessment>): number | null {
  const { phqLittleInterest, phqFeelingDown } = cna;
  if (phqLittleInterest == null || phqFeelingDown == null) return null;
  return phqLittleInterest + phqFeelingDown;
}

export function computePhq9Total(cna: Partial<CnaAssessment>): number | null {
  const scores = [
    cna.phqLittleInterest,
    cna.phqFeelingDown,
    cna.phqTroubleSleeping,
    cna.phqTiredLowEnergy,
    cna.phqAppetite,
    cna.phqFeelingBad,
    cna.phqTroubleConcentrating,
    cna.phqMovingSpeaking,
    cna.phqSelfHarmThoughts,
  ];
  if (scores.some((s) => s == null)) return null;
  return scores.reduce((sum: number, s) => sum + (s as number), 0);
}

export function computeCageTotal(cna: Partial<CnaAssessment>): number {
  return [cna.cageCutDown, cna.cageAnnoyed, cna.cageGuilty, cna.cageEyeOpener].filter((v) => v === true).length;
}

// Immediate-safety items on the CNA — surfaced as a prominent banner, mirroring
// the form's own "STOP AND CALL 911 IF THERE IS IMMINENT RISK" instruction.
export function getSafetyConcernReasons(cna: Partial<CnaAssessment>): string[] {
  const reasons: string[] = [];
  if (cna.hasImminentRisk === true) {
    reasons.push("Member reported an emergency or thoughts of hurting themselves or someone else — STOP AND CALL 911 IF THERE IS IMMINENT RISK.");
  }
  if (cna.phqSelfHarmThoughts != null && cna.phqSelfHarmThoughts > 0) {
    reasons.push("PHQ-9: reported thoughts of being better off dead or hurting themselves.");
  }
  if (cna.hasUrgentNeeds === true) {
    reasons.push("Member reported an urgent need (e.g. no place to sleep tonight, fear of harm in the home).");
  }
  return reasons;
}
