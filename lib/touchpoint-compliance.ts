// Program-based touchpoint compliance cadence, shared by every place in the
// app that flags a member as under-contacted.
//
// Prenatal and Postpartum (OB) members are checked monthly: 1 successful
// contact this month, or 3 attempts (successful or not) this month — either
// one satisfies the cadence. GYN members and everyone else (no program set,
// etc.) are checked on a rolling 3-month cycle anchored to the member's own
// enrollment date (their earliest signed intake, or chart creation date if
// none has been signed yet) rather than calendar-year quarters — GYN only
// needs 1 attempt (successful or not) per cycle, where the default bucket
// needs 3.
export type ComplianceUnit = "month" | "quarter";

export type ComplianceCadence = {
  unit: ComplianceUnit;
  requiredSuccessful: number;
  requiredAttempts: number;
};

// The programs a cadence can be keyed by — "Default" covers any member with
// no program set (or a value outside PATIENT_TYPE_OPTIONS). Settings >
// Touchpoint Cadence lets an admin override any of these per clinic (see
// prisma/schema.prisma's TouchpointCadence model and
// lib/data/touchpoint-cadence.ts); this map is just the fallback baseline —
// the app's original hardcoded behavior — for a clinic that's never touched
// that screen, or for a program with no override row yet.
export const CADENCE_PROGRAM_KEYS = ["Prenatal", "Postpartum", "GYN", "Default"] as const;
export type CadenceProgramKey = (typeof CADENCE_PROGRAM_KEYS)[number];

export const DEFAULT_CADENCES: Record<CadenceProgramKey, ComplianceCadence> = {
  Prenatal: { unit: "month", requiredSuccessful: 1, requiredAttempts: 3 },
  Postpartum: { unit: "month", requiredSuccessful: 1, requiredAttempts: 3 },
  GYN: { unit: "quarter", requiredSuccessful: 1, requiredAttempts: 1 },
  Default: { unit: "quarter", requiredSuccessful: 1, requiredAttempts: 3 },
};

// A clinic's saved overrides, keyed the same way — see
// lib/data/touchpoint-cadence.ts's getCadenceOverridesForClinic(). Optional
// everywhere below so every existing caller (tests, one-off scripts) that
// doesn't pass one keeps getting exactly DEFAULT_CADENCES, unchanged.
export type CadenceOverrides = Partial<Record<CadenceProgramKey, ComplianceCadence>>;

export function cadenceProgramKey(program: string | null | undefined): CadenceProgramKey {
  if (program === "Prenatal" || program === "Postpartum" || program === "GYN") return program;
  return "Default";
}

export function getComplianceCadence(program: string | null | undefined, overrides?: CadenceOverrides): ComplianceCadence {
  const key = cadenceProgramKey(program);
  return overrides?.[key] ?? DEFAULT_CADENCES[key];
}

// A member's enrollment anchor: the earliest date one of their intakes was
// signed, or their chart creation date if none has been signed yet. This is
// what quarterly compliance windows are counted from, per member.
export function firstEnrollmentDate(member: { createdAt: Date; intakeVersions: { signedAt: Date | null }[] }): Date {
  const signedDates = member.intakeVersions.map((v) => v.signedAt).filter((d): d is Date => d !== null);
  if (signedDates.length === 0) return member.createdAt;
  return signedDates.reduce((earliest, d) => (d < earliest ? d : earliest));
}

// Adds `months` to `date`, clamping the day-of-month to the last day of the
// target month instead of overflowing into the following one (so Jan 31 + 1
// month lands on Feb 28/29, not Mar 3).
function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

// Start of the rolling 3-month cycle containing `now`, counted in 3-month
// steps from `anchor` (a member's enrollment date) instead of the calendar
// year.
function getAnchoredQuarterStart(anchor: Date, now: Date): Date {
  const monthsElapsed = Math.max(0, monthsBetween(anchor, now));
  const cyclesElapsed = Math.floor(monthsElapsed / 3);
  const start = addMonthsClamped(anchor, cyclesElapsed * 3);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getAnchoredQuarterEnd(anchor: Date, now: Date): Date {
  const start = getAnchoredQuarterStart(anchor, now);
  const end = addMonthsClamped(start, 3);
  end.setTime(end.getTime() - 1);
  return end;
}

export function getWindowStart(unit: ComplianceUnit, now: Date, enrollmentDate: Date): Date {
  if (unit === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return getAnchoredQuarterStart(enrollmentDate, now);
}

export function getWindowEnd(unit: ComplianceUnit, now: Date, enrollmentDate: Date): Date {
  if (unit === "month") return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return getAnchoredQuarterEnd(enrollmentDate, now);
}

// A completed CNA's annual renewal due date — 1 year after the date it was
// completed, or null if one has never been completed (never-completed is
// always "due", handled by the caller).
export function cnaDueDate(lastCnaDate: Date | null): Date | null {
  if (!lastCnaDate) return null;
  return new Date(lastCnaDate.getFullYear() + 1, lastCnaDate.getMonth(), lastCnaDate.getDate());
}

// Whether a CNA is currently outstanding: never completed, or its annual
// renewal date has passed. Evaluated against `now` (today), not a specific
// past reporting period — "still due" always reflects the present.
export function isCnaStillDue(lastCnaDate: Date | null, now: Date): boolean {
  const dueDate = cnaDueDate(lastCnaDate);
  if (!dueDate) return true;
  return dueDate < now;
}

export type ContactRecord = { createdAt: Date; successful: boolean | null };

// A member's own ("Member Progress Updates", not "Care Coordinator") care
// plan goal notes count as a successful touchpoint alongside logged General
// Communication outreach — every note here is treated as successful=true.
export type ProgressNoteContactRecord = { date: Date | null; createdAt: Date };

export function progressNotesToContacts(notes: ProgressNoteContactRecord[]): ContactRecord[] {
  return notes.map((n) => ({ createdAt: n.date ?? n.createdAt, successful: true }));
}

// Contacts already scoped to a member — filters down to just the ones
// inside their program's current cadence window.
export function contactsInCurrentWindow<T extends ContactRecord>(
  contacts: T[],
  program: string | null | undefined,
  enrollmentDate: Date,
  now: Date = new Date(),
  overrides?: CadenceOverrides
): T[] {
  const { unit } = getComplianceCadence(program, overrides);
  const windowStart = getWindowStart(unit, now, enrollmentDate);
  return contacts.filter((c) => c.createdAt >= windowStart);
}

// Whether a member has met their program's touchpoint cadence for the
// window containing `now` (defaults to today). `contacts` only needs to
// include records from a bit over 3 months back — that's the widest window
// either cadence (monthly, or a member's own anchored quarter) ever needs.
export function isTouchpointCompliant(
  contacts: ContactRecord[],
  program: string | null | undefined,
  enrollmentDate: Date,
  now: Date = new Date(),
  overrides?: CadenceOverrides
): boolean {
  const { requiredSuccessful, requiredAttempts } = getComplianceCadence(program, overrides);
  const inWindow = contactsInCurrentWindow(contacts, program, enrollmentDate, now, overrides);
  const successfulCount = inWindow.filter((c) => c.successful).length;
  if (successfulCount >= requiredSuccessful) return true;
  return inWindow.length >= requiredAttempts;
}
