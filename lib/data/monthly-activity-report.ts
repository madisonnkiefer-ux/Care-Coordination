import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export type MonthlyActivityDetailRow = {
  id: string;
  firstName: string;
  lastName: string;
  medicaidId: string | null;
  firstHraDate: Date | null;
  firstCnaDate: Date | null;
  firstCcpDate: Date | null;
  touchpointsInRange: number;
  termedDate: Date | null;
};

export type MonthlySummaryRow = {
  month: string;
  totalTouchpoints: number;
  ccpsCreated: number;
  enrollmentsCompleted: number;
  membersTermed: number;
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Every calendar month from start through end, inclusive — so a range that
// only has activity in some months still shows 0-rows for the quiet ones.
function monthsInRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

// "Touchpoint" here means the same thing lib/touchpoint-compliance.ts and the
// rest of the app mean by it: a successful GeneralCommunication contact —
// there's a separate, unused Touchpoint model in the schema this app doesn't
// actually populate.
export async function getMonthlyActivityReport(
  startDate: Date,
  endDate: Date
): Promise<{ detailRows: MonthlyActivityDetailRow[]; summaryRows: MonthlySummaryRow[] }> {
  const session = await requireRole("SUPERVISOR", "ADMIN");
  const clinicId = session.clinicId;

  const rangeEnd = new Date(endDate);
  rangeEnd.setHours(23, 59, 59, 999);

  const [touchpoints, termedChanges, carePlansCreated, enrollmentsSigned] = await Promise.all([
    db.generalCommunication.findMany({
      where: { successful: true, createdAt: { gte: startDate, lte: rangeEnd }, member: { clinicId, deletedAt: null } },
      select: { memberId: true, createdAt: true },
    }),
    db.memberStatusChange.findMany({
      where: {
        toStatus: "TERMED",
        approvedAt: { not: null },
        effectiveDate: { gte: startDate, lte: rangeEnd },
        member: { clinicId, deletedAt: null },
      },
      select: { memberId: true, effectiveDate: true },
      orderBy: { effectiveDate: "asc" },
    }),
    db.carePlan.findMany({
      where: { createdAt: { gte: startDate, lte: rangeEnd }, member: { clinicId, deletedAt: null } },
      select: { createdAt: true },
    }),
    db.intakeVersion.findMany({
      where: { signedAt: { gte: startDate, lte: rangeEnd }, member: { clinicId, deletedAt: null } },
      select: { signedAt: true },
    }),
  ]);

  // ---- Detail rows: every patient in the clinic, not just those with activity in range ----
  const touchpointCountByMember = new Map<string, number>();
  for (const t of touchpoints) {
    touchpointCountByMember.set(t.memberId, (touchpointCountByMember.get(t.memberId) ?? 0) + 1);
  }
  const termedDateByMember = new Map<string, Date>();
  for (const t of termedChanges) {
    if (!termedDateByMember.has(t.memberId)) termedDateByMember.set(t.memberId, t.effectiveDate);
  }

  const members = await db.member.findMany({
    where: { clinicId },
    select: { id: true, firstName: true, lastName: true, medicaidId: true },
  });
  const allMemberIds = members.map((m) => m.id);

  const [intakeVersions, carePlansByMember] = await Promise.all([
    // Goes through IntakeVersion directly (not member.hraAssessments/cnaAssessments)
    // so the soft-delete extension actually filters out deleted enrollments —
    // a nested relation select on Member wouldn't apply it.
    db.intakeVersion.findMany({
      where: { memberId: { in: allMemberIds } },
      orderBy: { createdAt: "asc" },
      select: {
        memberId: true,
        hra: { select: { assessmentDate: true } },
        cna: { select: { assessmentDate: true } },
      },
    }),
    db.carePlan.findMany({
      where: { memberId: { in: allMemberIds } },
      orderBy: { createdAt: "asc" },
      select: { memberId: true, ccpStartDate: true, createdAt: true },
    }),
  ]);

  const firstHraByMember = new Map<string, Date>();
  const firstCnaByMember = new Map<string, Date>();
  for (const v of intakeVersions) {
    if (v.hra?.assessmentDate && !firstHraByMember.has(v.memberId)) firstHraByMember.set(v.memberId, v.hra.assessmentDate);
    if (v.cna?.assessmentDate && !firstCnaByMember.has(v.memberId)) firstCnaByMember.set(v.memberId, v.cna.assessmentDate);
  }
  const firstCcpByMember = new Map<string, Date>();
  for (const p of carePlansByMember) {
    if (!firstCcpByMember.has(p.memberId)) firstCcpByMember.set(p.memberId, p.ccpStartDate ?? p.createdAt);
  }

  const detailRows: MonthlyActivityDetailRow[] = members
    .map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      medicaidId: m.medicaidId,
      firstHraDate: firstHraByMember.get(m.id) ?? null,
      firstCnaDate: firstCnaByMember.get(m.id) ?? null,
      firstCcpDate: firstCcpByMember.get(m.id) ?? null,
      touchpointsInRange: touchpointCountByMember.get(m.id) ?? 0,
      termedDate: termedDateByMember.get(m.id) ?? null,
    }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

  // ---- Summary rows: one per calendar month in range ----
  const touchpointsByMonth = new Map<string, number>();
  for (const t of touchpoints) {
    const key = monthKey(t.createdAt);
    touchpointsByMonth.set(key, (touchpointsByMonth.get(key) ?? 0) + 1);
  }
  const ccpsByMonth = new Map<string, number>();
  for (const p of carePlansCreated) {
    const key = monthKey(p.createdAt);
    ccpsByMonth.set(key, (ccpsByMonth.get(key) ?? 0) + 1);
  }
  const enrollmentsByMonth = new Map<string, number>();
  for (const v of enrollmentsSigned) {
    if (!v.signedAt) continue;
    const key = monthKey(v.signedAt);
    enrollmentsByMonth.set(key, (enrollmentsByMonth.get(key) ?? 0) + 1);
  }
  const termedByMonth = new Map<string, number>();
  for (const t of termedChanges) {
    const key = monthKey(t.effectiveDate);
    termedByMonth.set(key, (termedByMonth.get(key) ?? 0) + 1);
  }

  const summaryRows: MonthlySummaryRow[] = monthsInRange(startDate, endDate).map((key) => ({
    month: monthLabel(key),
    totalTouchpoints: touchpointsByMonth.get(key) ?? 0,
    ccpsCreated: ccpsByMonth.get(key) ?? 0,
    enrollmentsCompleted: enrollmentsByMonth.get(key) ?? 0,
    membersTermed: termedByMonth.get(key) ?? 0,
  }));

  return { detailRows, summaryRows };
}
