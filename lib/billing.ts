// Billing roster eligibility and filtering, shared by the Billing page
// (client-side table view) and the Excel export route handler (authoritative
// server-side re-filter at export time — see app/api/billing/export/route.ts).
import { titleCase } from "@/lib/format";
import type { MemberStatus } from "@/app/generated/prisma/client";

// Members in one of these activity statuses are billing-eligible by default.
// Everything else (Termed, Graduated, Declined, Unable to Reach, etc.) is
// excluded automatically, with the status itself as the reason. A member can
// also be excluded manually regardless of status — see Member.billingExcluded.
export const BILLING_ELIGIBLE_STATUSES: MemberStatus[] = ["ACTIVE", "ENROLLED"];

export function computeBillingEligibility(member: {
  status: MemberStatus;
  billingExcluded: boolean;
  billingExclusionReason: string | null;
}): { eligible: boolean; reason: string | null } {
  if (member.billingExcluded) {
    return { eligible: false, reason: member.billingExclusionReason ?? "Manually excluded" };
  }
  if (!BILLING_ELIGIBLE_STATUSES.includes(member.status)) {
    return { eligible: false, reason: `Status: ${titleCase(member.status)}` };
  }
  return { eligible: true, reason: null };
}

export type BillingFilters = {
  status?: string;
  insurancePlan?: string;
  eligibilityVerified?: string; // "verified" | "unverified"
  coordinatorId?: string;
  billingInclusion?: string; // "included" | "excluded"
};

export function filterBillingRows<
  T extends {
    status: string;
    insurancePlan: string | null;
    eligibilityVerified: boolean | null;
    coordinatorId: string | null;
    billingEligible: boolean;
  },
>(rows: T[], filters: BillingFilters): T[] {
  return rows.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.insurancePlan && r.insurancePlan !== filters.insurancePlan) return false;
    if (filters.eligibilityVerified === "verified" && r.eligibilityVerified !== true) return false;
    if (filters.eligibilityVerified === "unverified" && r.eligibilityVerified === true) return false;
    if (filters.coordinatorId && r.coordinatorId !== filters.coordinatorId) return false;
    if (filters.billingInclusion === "included" && !r.billingEligible) return false;
    if (filters.billingInclusion === "excluded" && r.billingEligible) return false;
    return true;
  });
}
