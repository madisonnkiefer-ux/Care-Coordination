import { describe, expect, it } from "vitest";
import { computeBillingEligibility, filterBillingRows, BILLING_ELIGIBLE_STATUSES } from "../billing";

describe("computeBillingEligibility", () => {
  it("is eligible for an ACTIVE, non-excluded member", () => {
    expect(computeBillingEligibility({ status: "ACTIVE", billingExcluded: false, billingExclusionReason: null })).toEqual({
      eligible: true,
      reason: null,
    });
  });

  it("is eligible for an ENROLLED, non-excluded member", () => {
    expect(computeBillingEligibility({ status: "ENROLLED", billingExcluded: false, billingExclusionReason: null })).toEqual({
      eligible: true,
      reason: null,
    });
  });

  it("is ineligible for a status outside BILLING_ELIGIBLE_STATUSES, with the status as the reason", () => {
    expect(computeBillingEligibility({ status: "TERMED", billingExcluded: false, billingExclusionReason: null })).toEqual({
      eligible: false,
      reason: "Status: Termed",
    });
  });

  it("manual exclusion overrides an otherwise-eligible status", () => {
    expect(
      computeBillingEligibility({ status: "ACTIVE", billingExcluded: true, billingExclusionReason: "No insurance on file" })
    ).toEqual({ eligible: false, reason: "No insurance on file" });
  });

  it("manual exclusion with no reason recorded falls back to a generic reason", () => {
    expect(computeBillingEligibility({ status: "ACTIVE", billingExcluded: true, billingExclusionReason: null })).toEqual({
      eligible: false,
      reason: "Manually excluded",
    });
  });

  it("manual exclusion is checked before the status check — an excluded member never gets a status-based reason", () => {
    const result = computeBillingEligibility({ status: "TERMED", billingExcluded: true, billingExclusionReason: "Duplicate record" });
    expect(result.reason).toBe("Duplicate record");
  });

  it("BILLING_ELIGIBLE_STATUSES is exactly ACTIVE and ENROLLED — a change here silently changes who gets billed", () => {
    expect(BILLING_ELIGIBLE_STATUSES).toEqual(["ACTIVE", "ENROLLED"]);
  });
});

describe("filterBillingRows", () => {
  const rows = [
    { status: "ACTIVE", insurancePlan: "Plan A", eligibilityVerified: true, coordinatorId: "cc-1", billingEligible: true },
    { status: "ACTIVE", insurancePlan: "Plan B", eligibilityVerified: false, coordinatorId: "cc-2", billingEligible: true },
    { status: "TERMED", insurancePlan: "Plan A", eligibilityVerified: null, coordinatorId: "cc-1", billingEligible: false },
  ];

  it("returns all rows when no filters are set", () => {
    expect(filterBillingRows(rows, {})).toHaveLength(3);
  });

  it("filters by status", () => {
    expect(filterBillingRows(rows, { status: "TERMED" })).toEqual([rows[2]]);
  });

  it("filters by insurancePlan", () => {
    expect(filterBillingRows(rows, { insurancePlan: "Plan A" })).toEqual([rows[0], rows[2]]);
  });

  it("filters eligibilityVerified: verified means strictly true, not just truthy", () => {
    expect(filterBillingRows(rows, { eligibilityVerified: "verified" })).toEqual([rows[0]]);
  });

  it("filters eligibilityVerified: unverified includes both false and null", () => {
    expect(filterBillingRows(rows, { eligibilityVerified: "unverified" })).toEqual([rows[1], rows[2]]);
  });

  it("filters by coordinatorId", () => {
    expect(filterBillingRows(rows, { coordinatorId: "cc-2" })).toEqual([rows[1]]);
  });

  it("filters billingInclusion: included vs excluded", () => {
    expect(filterBillingRows(rows, { billingInclusion: "included" })).toEqual([rows[0], rows[1]]);
    expect(filterBillingRows(rows, { billingInclusion: "excluded" })).toEqual([rows[2]]);
  });

  it("combines multiple filters (AND, not OR)", () => {
    expect(filterBillingRows(rows, { status: "ACTIVE", insurancePlan: "Plan A" })).toEqual([rows[0]]);
  });
});
