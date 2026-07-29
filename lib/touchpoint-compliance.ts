// Program-based touchpoint compliance cadence, shared by every place in the
// app that flags a member as under-contacted.
//
// Prenatal and Postpartum members are checked monthly: 1 successful contact
// this month, or 3 attempts (successful or not) this month — either one
// satisfies the cadence. Every other program (GYN, Chronic Care, none set,
// etc.) is checked quarterly on the same 1-successful-or-3-attempts rule.
export type ComplianceUnit = "month" | "quarter";

export type ComplianceCadence = {
  unit: ComplianceUnit;
  requiredSuccessful: number;
  requiredAttempts: number;
};

export function getComplianceCadence(program: string | null | undefined): ComplianceCadence {
  if (program === "Prenatal" || program === "Postpartum") {
    return { unit: "month", requiredSuccessful: 1, requiredAttempts: 3 };
  }
  return { unit: "quarter", requiredSuccessful: 1, requiredAttempts: 3 };
}

export function getWindowStart(unit: ComplianceUnit, now: Date): Date {
  if (unit === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), quarterStartMonth, 1);
}

export function getWindowEnd(unit: ComplianceUnit, now: Date): Date {
  if (unit === "month") return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
}

export type ContactRecord = { createdAt: Date; successful: boolean | null };

// Contacts already scoped to a member — filters down to just the ones
// inside their program's current cadence window.
export function contactsInCurrentWindow<T extends ContactRecord>(contacts: T[], program: string | null | undefined, now: Date = new Date()): T[] {
  const { unit } = getComplianceCadence(program);
  const windowStart = getWindowStart(unit, now);
  return contacts.filter((c) => c.createdAt >= windowStart);
}

// Whether a member has met their program's touchpoint cadence for the
// window containing `now` (defaults to today). `contacts` only needs to
// include records from the current quarter onward — that's the widest
// window either cadence ever needs.
export function isTouchpointCompliant(contacts: ContactRecord[], program: string | null | undefined, now: Date = new Date()): boolean {
  const { requiredSuccessful, requiredAttempts } = getComplianceCadence(program);
  const inWindow = contactsInCurrentWindow(contacts, program, now);
  const successfulCount = inWindow.filter((c) => c.successful).length;
  if (successfulCount >= requiredSuccessful) return true;
  return inWindow.length >= requiredAttempts;
}
