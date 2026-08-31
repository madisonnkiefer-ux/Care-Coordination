// Pure calculation logic for the Team Monthly Snapshot / Individual CC
// Snapshot / Outreach Attempt Funnel reports (components/reports/reports-client.tsx).
// Kept separate from that "use client" file so this math is unit-testable
// on its own — see lib/__tests__/team-performance.test.ts, which validates
// it against the supervisor-provided July example.
import { isCnaStillDue, isTouchpointCompliant, type ContactRecord } from "@/lib/touchpoint-compliance";

export type PerformanceMember = {
  status: string;
  program: string | null;
  enrollmentDate: Date;
  contacts: ContactRecord[];
  cnaCompletions: Date[];
  lastCnaDate: Date | null;
};

export function monthBounds(month: string): { monthStart: Date; monthEnd: Date } {
  const [year, monthNum] = month.split("-").map(Number);
  return {
    monthStart: new Date(year, monthNum - 1, 1),
    monthEnd: new Date(year, monthNum, 0, 23, 59, 59, 999),
  };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type CoordinatorRow = {
  id: string;
  name: string;
  members: number;
  successfulTouchpoints: number;
  successRate: number | null;
  totalAttempts: number;
  cnasCompleted: number;
  cnasStillDue: number;
};

// One coordinator's row for the Team Monthly Snapshot — also reused as-is
// for the Individual CC Snapshot's stat tiles, so the two views can never
// disagree with each other about the same coordinator/month.
//
// % Successful Touchpoints is floored, not rounded — validated against the
// supervisor-provided July example (e.g. 41/70 = 58.57% displays as 58%,
// not 59%).
export function computeCoordinatorRow(
  id: string,
  name: string,
  caseload: PerformanceMember[],
  monthStart: Date,
  monthEnd: Date,
  now: Date
): CoordinatorRow {
  const inMonth = (d: Date) => d >= monthStart && d <= monthEnd;
  const activeCaseload = caseload.filter((m) => m.status === "ACTIVE");

  let successfulTouchpoints = 0;
  let totalAttempts = 0;
  let cnasCompleted = 0;
  let cnasStillDue = 0;

  for (const m of activeCaseload) {
    const contactsInMonth = m.contacts.filter((c) => inMonth(c.createdAt));
    if (contactsInMonth.some((c) => c.successful)) successfulTouchpoints += 1;
    totalAttempts += contactsInMonth.filter((c) => c.successful === false).length;
    cnasCompleted += m.cnaCompletions.filter(inMonth).length;
    if (isCnaStillDue(m.lastCnaDate, now)) cnasStillDue += 1;
  }

  const members = activeCaseload.length;
  return {
    id,
    name,
    members,
    successfulTouchpoints,
    successRate: members > 0 ? Math.floor((successfulTouchpoints / members) * 100) : null,
    totalAttempts,
    cnasCompleted,
    cnasStillDue,
  };
}

export type FunnelStage = {
  stage: number;
  label: string;
  required: number;
  attemptsMade: number;
  percentCompleted: number | null;
  successful: number;
  notAttempted: number;
  percentNotAttempted: number | null;
};

// The Outreach Attempt Funnel: starting population is this coordinator's
// active caseload members who had NOT yet met their program's touchpoint
// cadence going into the selected month — i.e. isTouchpointCompliant
// evaluated using only contact history from before the month started (same
// cadence logic driving the "Contacted" status badge elsewhere —
// Prenatal/Postpartum checked monthly, GYN and everyone else on their own
// rolling quarter). This is deliberately based on contacts strictly before
// monthStart, not through monthEnd — a member who succeeds on their very
// first attempt of the month is still someone who "required" that attempt;
// evaluating compliance with the month's own contacts already counted would
// silently drop them from the funnel instead of showing them resolved at
// stage 1. Each member's contacts within the month are then walked in
// order: a member drops out of the funnel the moment one succeeds, so the
// population requiring the 2nd/3rd attempt only ever shrinks.
export function computeFunnel(caseload: PerformanceMember[], monthStart: Date, monthEnd: Date): FunnelStage[] {
  const inMonth = (d: Date) => d >= monthStart && d <= monthEnd;
  const population = caseload.filter((m) => {
    if (m.status !== "ACTIVE") return false;
    const priorContacts = m.contacts.filter((c) => c.createdAt < monthStart);
    return !isTouchpointCompliant(priorContacts, m.program, m.enrollmentDate, monthEnd);
  });

  // Per member: their attempts this month, in order, stopping at the first
  // success (or after 3 — the funnel only tracks three attempts).
  const memberOutcomes = population.map((m) => {
    const sorted = [...m.contacts.filter((c) => inMonth(c.createdAt))].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const results: boolean[] = [];
    for (const c of sorted) {
      if (results.length >= 3) break;
      results.push(Boolean(c.successful));
      if (c.successful) break;
    }
    return results;
  });

  const stages: FunnelStage[] = [];
  let required = population.length;
  for (let stageNum = 1; stageNum <= 3; stageNum++) {
    let attemptsMade = 0;
    let successful = 0;
    for (const results of memberOutcomes) {
      if (results.length >= stageNum) {
        attemptsMade += 1;
        if (results.length === stageNum && results[stageNum - 1]) successful += 1;
      }
    }
    const notAttempted = required - attemptsMade;
    stages.push({
      stage: stageNum,
      label: ["1st Attempt", "2nd Attempt", "3rd Attempt"][stageNum - 1],
      required,
      attemptsMade,
      percentCompleted: required > 0 ? round1((attemptsMade / required) * 100) : null,
      successful,
      notAttempted,
      percentNotAttempted: required > 0 ? round1((notAttempted / required) * 100) : null,
    });
    required -= successful;
  }
  return stages;
}
