// The BCBSNM "DCCE Tasking Tool" day-offset schedule for CCL1/CCL2
// members — a different, more precise cadence than the program-based one
// in lib/touchpoint-compliance.ts. That system anchors quarters to
// calendar months or the member's enrollment date; this one instead
// anchors every window to the member's most recently COMPLETED CNA
// (Initial counts as the very first anchor; each later Annual/Semi-Annual
// completion re-anchors the next cycle — this module doesn't track cycles
// itself, it just computes one cycle's windows from whatever anchor date
// the caller passes in).
//
// CCL1 runs a 12-month cycle: 4 quarterly telephone contacts, 2 bi-annual
// in-person visits, and one Annual CNA schedule/complete window at the
// end. CCL2 runs the same first 6 months, but ends the cycle with a
// Semi-Annual CNA instead of an Annual one.
//
// Day counts below match the source workbook's own formulas exactly
// (e.g. Quarter 1 = anchor+1 to anchor+90) — see the CCL1/CCL2 tabs of
// the BCBSNM DCCE Tasking Tool.
import type { CclLevel } from "@/app/generated/prisma/client";

export type CclTaskType = "quarterly_call" | "biannual_visit" | "cna_schedule" | "cna_complete";

export type CclTask = {
  key: string;
  label: string;
  type: CclTaskType;
  completeOnOrAfter: Date;
  completeNoLaterThan: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function computeCcl1Schedule(anchor: Date): CclTask[] {
  return [
    { key: "q1", label: "Quarter 1 Telephone Contact", type: "quarterly_call", completeOnOrAfter: addDays(anchor, 1), completeNoLaterThan: addDays(anchor, 90) },
    { key: "q2", label: "Quarter 2 Telephone Contact", type: "quarterly_call", completeOnOrAfter: addDays(anchor, 91), completeNoLaterThan: addDays(anchor, 180) },
    { key: "biannual1", label: "Bi-Annual In-Person Visit (1st Half)", type: "biannual_visit", completeOnOrAfter: addDays(anchor, 1), completeNoLaterThan: addDays(anchor, 180) },
    { key: "q3", label: "Quarter 3 Telephone Contact", type: "quarterly_call", completeOnOrAfter: addDays(anchor, 181), completeNoLaterThan: addDays(anchor, 270) },
    { key: "q4", label: "Quarter 4 Telephone Contact", type: "quarterly_call", completeOnOrAfter: addDays(anchor, 271), completeNoLaterThan: addDays(anchor, 360) },
    { key: "biannual2", label: "Bi-Annual In-Person Visit (2nd Half)", type: "biannual_visit", completeOnOrAfter: addDays(anchor, 181), completeNoLaterThan: addDays(anchor, 365) },
    { key: "cna_schedule", label: "Schedule Annual CNA", type: "cna_schedule", completeOnOrAfter: addDays(anchor, 305), completeNoLaterThan: addDays(anchor, 319) },
    { key: "cna_complete", label: "Complete Annual CNA", type: "cna_complete", completeOnOrAfter: addDays(anchor, 335), completeNoLaterThan: addDays(anchor, 365) },
  ];
}

export function computeCcl2Schedule(anchor: Date): CclTask[] {
  return [
    { key: "q1", label: "Quarter 1 Telephone Contact", type: "quarterly_call", completeOnOrAfter: addDays(anchor, 1), completeNoLaterThan: addDays(anchor, 90) },
    { key: "q2", label: "Quarter 2 Telephone Contact", type: "quarterly_call", completeOnOrAfter: addDays(anchor, 91), completeNoLaterThan: addDays(anchor, 180) },
    { key: "biannual1", label: "Bi-Annual In-Person Visit", type: "biannual_visit", completeOnOrAfter: addDays(anchor, 1), completeNoLaterThan: addDays(anchor, 180) },
    { key: "cna_schedule", label: "Schedule Semi-Annual CNA", type: "cna_schedule", completeOnOrAfter: addDays(anchor, 120), completeNoLaterThan: addDays(anchor, 134) },
    { key: "cna_complete", label: "Complete Semi-Annual CNA", type: "cna_complete", completeOnOrAfter: addDays(anchor, 150), completeNoLaterThan: addDays(anchor, 180) },
  ];
}

export function hasCclSchedule(cclLevel: CclLevel | null | undefined): cclLevel is "CCL1" | "CCL2" {
  return cclLevel === "CCL1" || cclLevel === "CCL2";
}

export function computeCclSchedule(cclLevel: CclLevel | null | undefined, anchor: Date): CclTask[] | null {
  if (cclLevel === "CCL1") return computeCcl1Schedule(anchor);
  if (cclLevel === "CCL2") return computeCcl2Schedule(anchor);
  return null;
}

export type CclContactRecord = { createdAt: Date; successful: boolean | null; inPerson: boolean };
export type CclCnaRecord = { assessmentDate: Date; status: "DRAFT" | "COMPLETED" };

export type CclTaskStatus = "completed" | "overdue" | "upcoming";
export type CclScheduleTask = CclTask & { status: CclTaskStatus };

function inWindow(date: Date, task: CclTask): boolean {
  return date >= task.completeOnOrAfter && date <= task.completeNoLaterThan;
}

function isTaskSatisfied(task: CclTask, contacts: CclContactRecord[], cnaRecords: CclCnaRecord[]): boolean {
  switch (task.type) {
    case "quarterly_call":
      return contacts.some((c) => c.successful && inWindow(c.createdAt, task));
    case "biannual_visit":
      return contacts.some((c) => c.successful && c.inPerson && inWindow(c.createdAt, task));
    case "cna_schedule":
      return cnaRecords.some((c) => inWindow(c.assessmentDate, task));
    case "cna_complete":
      return cnaRecords.some((c) => c.status === "COMPLETED" && inWindow(c.assessmentDate, task));
  }
}

// The full schedule, each task annotated with its status for display —
// this is what the read-only chart panel renders. Returns null when the
// member isn't CCL1/CCL2, so callers can render nothing rather than an
// empty list.
export function evaluateCclSchedule(
  cclLevel: CclLevel | null | undefined,
  anchor: Date,
  now: Date,
  contacts: CclContactRecord[],
  cnaRecords: CclCnaRecord[]
): CclScheduleTask[] | null {
  const schedule = computeCclSchedule(cclLevel, anchor);
  if (!schedule) return null;

  return schedule.map((task) => {
    const satisfied = isTaskSatisfied(task, contacts, cnaRecords);
    const status: CclTaskStatus = satisfied ? "completed" : now > task.completeNoLaterThan ? "overdue" : "upcoming";
    return { ...task, status };
  });
}

// Whether a CCL1/CCL2 member is compliant right now, replacing the
// program-based rule in lib/touchpoint-compliance.ts for these two
// levels: has the CURRENT quarterly-call window (the one containing
// `now`, or the most recent one if `now` has run past every defined
// window — e.g. an overdue CNA left the schedule stale) already had a
// successful contact land inside it. Returns null when this schedule
// doesn't apply (not CCL1/CCL2, or no CNA on file yet to anchor from) so
// callers know to fall back to the program-based rule instead.
// The next thing on a CCL1/CCL2 member's schedule that isn't done yet — an
// overdue task takes priority over a merely-upcoming one, and within each
// group the earliest deadline goes first, so this is always "what should
// this member's coordinator look at next," not just "what's chronologically
// first." Returns null once every task in the schedule is complete.
export function nextCclTask(tasks: CclScheduleTask[]): CclScheduleTask | null {
  const outstanding = tasks.filter((t) => t.status !== "completed");
  if (outstanding.length === 0) return null;
  const overdue = outstanding.filter((t) => t.status === "overdue");
  const pool = overdue.length > 0 ? overdue : outstanding;
  return pool.reduce((soonest, t) => (t.completeNoLaterThan < soonest.completeNoLaterThan ? t : soonest));
}

export function isCclCompliant(
  cclLevel: CclLevel | null | undefined,
  anchor: Date | null,
  now: Date,
  contacts: { createdAt: Date; successful: boolean | null }[]
): boolean | null {
  if (!hasCclSchedule(cclLevel) || !anchor) return null;
  const schedule = computeCclSchedule(cclLevel, anchor)!;
  const calls = schedule.filter((t) => t.type === "quarterly_call");
  const current = calls.find((t) => now >= t.completeOnOrAfter && now <= t.completeNoLaterThan) ?? calls[calls.length - 1];
  return contacts.some((c) => c.successful && inWindow(c.createdAt, current));
}
