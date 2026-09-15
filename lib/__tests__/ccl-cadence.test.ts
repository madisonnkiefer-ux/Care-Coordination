import { describe, expect, it } from "vitest";
import { computeCcl1Schedule, computeCcl2Schedule, evaluateCclSchedule, isCclCompliant } from "../ccl-cadence";

// Validated against the BCBSNM DCCE Tasking Tool's own computed output
// (CCL1 tab, "ENTER Date of Annual CNA" = 2025-03-01).
describe("computeCcl1Schedule", () => {
  const anchor = new Date(2025, 2, 1); // Mar 1, 2025
  const tasks = computeCcl1Schedule(anchor);
  const byKey = Object.fromEntries(tasks.map((t) => [t.key, t]));

  it("matches the workbook's Quarter windows", () => {
    expect(byKey.q1.completeOnOrAfter).toEqual(new Date(2025, 2, 2));
    expect(byKey.q1.completeNoLaterThan).toEqual(new Date(2025, 4, 30));
    expect(byKey.q2.completeOnOrAfter).toEqual(new Date(2025, 4, 31));
    expect(byKey.q2.completeNoLaterThan).toEqual(new Date(2025, 7, 28));
    expect(byKey.q3.completeOnOrAfter).toEqual(new Date(2025, 7, 29));
    expect(byKey.q3.completeNoLaterThan).toEqual(new Date(2025, 10, 26));
    expect(byKey.q4.completeOnOrAfter).toEqual(new Date(2025, 10, 27));
    expect(byKey.q4.completeNoLaterThan).toEqual(new Date(2026, 1, 24));
  });

  it("matches the workbook's Bi-Annual and Annual CNA windows", () => {
    expect(byKey.biannual1.completeOnOrAfter).toEqual(new Date(2025, 2, 2));
    expect(byKey.biannual1.completeNoLaterThan).toEqual(new Date(2025, 7, 28));
    expect(byKey.biannual2.completeOnOrAfter).toEqual(new Date(2025, 7, 29));
    expect(byKey.biannual2.completeNoLaterThan).toEqual(new Date(2026, 2, 1));
    expect(byKey.cna_schedule.completeOnOrAfter).toEqual(new Date(2025, 11, 31));
    expect(byKey.cna_schedule.completeNoLaterThan).toEqual(new Date(2026, 0, 14));
    expect(byKey.cna_complete.completeOnOrAfter).toEqual(new Date(2026, 0, 30));
    expect(byKey.cna_complete.completeNoLaterThan).toEqual(new Date(2026, 2, 1));
  });
});

// CCL2 tab, "ENTER Date of Annual CNA" = 2026-01-15.
describe("computeCcl2Schedule", () => {
  const anchor = new Date(2026, 0, 15); // Jan 15, 2026
  const tasks = computeCcl2Schedule(anchor);
  const byKey = Object.fromEntries(tasks.map((t) => [t.key, t]));

  it("matches the workbook's windows", () => {
    expect(byKey.q1.completeOnOrAfter).toEqual(new Date(2026, 0, 16));
    expect(byKey.q1.completeNoLaterThan).toEqual(new Date(2026, 3, 15));
    expect(byKey.q2.completeOnOrAfter).toEqual(new Date(2026, 3, 16));
    expect(byKey.q2.completeNoLaterThan).toEqual(new Date(2026, 6, 14));
    expect(byKey.biannual1.completeOnOrAfter).toEqual(new Date(2026, 0, 16));
    expect(byKey.biannual1.completeNoLaterThan).toEqual(new Date(2026, 6, 14));
    expect(byKey.cna_schedule.completeOnOrAfter).toEqual(new Date(2026, 4, 15));
    expect(byKey.cna_schedule.completeNoLaterThan).toEqual(new Date(2026, 4, 29));
    expect(byKey.cna_complete.completeOnOrAfter).toEqual(new Date(2026, 5, 14));
    expect(byKey.cna_complete.completeNoLaterThan).toEqual(new Date(2026, 6, 14));
  });

  it("only has 5 tasks (no Quarter 3/4 baked in — those come from the next cycle's own anchor)", () => {
    expect(tasks).toHaveLength(5);
  });
});

describe("evaluateCclSchedule", () => {
  const anchor = new Date(2025, 2, 1);

  it("marks a quarterly call completed when a successful contact lands in its window", () => {
    const now = new Date(2025, 3, 1); // mid Q1
    const contacts = [{ createdAt: new Date(2025, 2, 10), successful: true, inPerson: false }];
    const tasks = evaluateCclSchedule("CCL1", anchor, now, contacts, []);
    expect(tasks?.find((t) => t.key === "q1")?.status).toBe("completed");
  });

  it("marks a quarterly call overdue once its deadline has passed with no successful contact", () => {
    const now = new Date(2025, 6, 1); // past Q1's May 30 deadline
    const tasks = evaluateCclSchedule("CCL1", anchor, now, [], []);
    expect(tasks?.find((t) => t.key === "q1")?.status).toBe("overdue");
  });

  it("marks a quarterly call upcoming before its deadline with no contact yet", () => {
    const now = new Date(2025, 2, 15); // still within Q1
    const tasks = evaluateCclSchedule("CCL1", anchor, now, [], []);
    expect(tasks?.find((t) => t.key === "q1")?.status).toBe("upcoming");
  });

  it("only counts in-person contacts toward the Bi-Annual visit task", () => {
    const now = new Date(2025, 3, 1);
    const phoneOnly = [{ createdAt: new Date(2025, 2, 10), successful: true, inPerson: false }];
    const withVisit = [{ createdAt: new Date(2025, 2, 10), successful: true, inPerson: true }];
    expect(evaluateCclSchedule("CCL1", anchor, now, phoneOnly, [])?.find((t) => t.key === "biannual1")?.status).toBe("upcoming");
    expect(evaluateCclSchedule("CCL1", anchor, now, withVisit, [])?.find((t) => t.key === "biannual1")?.status).toBe("completed");
  });

  it("marks the Complete CNA task done only from a COMPLETED assessment in its window", () => {
    const now = new Date(2026, 1, 1);
    const draftOnly = [{ assessmentDate: new Date(2025, 11, 1), status: "DRAFT" as const }];
    const completed = [{ assessmentDate: new Date(2026, 1, 1), status: "COMPLETED" as const }];
    expect(evaluateCclSchedule("CCL1", anchor, now, [], draftOnly)?.find((t) => t.key === "cna_complete")?.status).not.toBe("completed");
    expect(evaluateCclSchedule("CCL1", anchor, now, [], completed)?.find((t) => t.key === "cna_complete")?.status).toBe("completed");
  });

  it("returns null for a member not on CCL1/CCL2", () => {
    expect(evaluateCclSchedule("CCL0", anchor, new Date(), [], [])).toBeNull();
    expect(evaluateCclSchedule(null, anchor, new Date(), [], [])).toBeNull();
  });
});

describe("isCclCompliant", () => {
  const anchor = new Date(2025, 2, 1);

  it("is compliant when the current quarter already has a successful contact", () => {
    const now = new Date(2025, 3, 1);
    const contacts = [{ createdAt: new Date(2025, 2, 10), successful: true, inPerson: false }];
    expect(isCclCompliant("CCL1", anchor, now, contacts)).toBe(true);
  });

  it("is not compliant when the current quarter has no successful contact yet", () => {
    const now = new Date(2025, 3, 1);
    expect(isCclCompliant("CCL1", anchor, now, [])).toBe(false);
  });

  it("falls back to the last defined quarter once now has run past every window", () => {
    // Nothing scheduled beyond Q4 (day 360) since a new CNA should have
    // re-anchored the cycle by then — a stale anchor still evaluates
    // against Q4 rather than crashing or silently passing.
    const now = new Date(2026, 5, 1); // well past CCL1's 1-year cycle
    const q4Contact = [{ createdAt: new Date(2026, 0, 15), successful: true, inPerson: false }];
    expect(isCclCompliant("CCL1", anchor, now, [])).toBe(false);
    expect(isCclCompliant("CCL1", anchor, now, q4Contact)).toBe(true);
  });

  it("returns null when not CCL1/CCL2, or no anchor CNA date exists", () => {
    expect(isCclCompliant("CCL0", anchor, new Date(), [])).toBeNull();
    expect(isCclCompliant("CCL1", null, new Date(), [])).toBeNull();
  });
});
