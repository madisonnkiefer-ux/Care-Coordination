import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { TERMINAL_STATUSES } from "@/lib/member-status";
import { firstEnrollmentDate, getComplianceCadence, getWindowStart, isTouchpointCompliant, progressNotesToContacts } from "@/lib/touchpoint-compliance";
import { addBusinessDays, businessDaysBetween } from "@/lib/business-days";

// A member's CCP is due 14 business days after their enrollment starts
// (their chart is created). No renewal cadence — once it's done, it's done.
const INITIAL_CCP_DUE_BUSINESS_DAYS = 14;

export async function getSupervisorData() {
  const session = await requireRole("SUPERVISOR", "ADMIN");
  const clinicId = session.clinicId;

  await writeAuditLog({
    userId: session.userId,
    action: "VIEW",
    resource: "SupervisorDashboard",
  });

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  // Widest window either cadence ever needs, regardless of a member's own
  // enrollment anchor: a monthly cadence never looks back further than the
  // start of this month, and an anchored quarter is always fully contained
  // within the last 3 calendar months.
  const contactFetchFloor = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const [
    totalMembers,
    membersWithCompletedCna,
    membersWithCompletedHra,
    membersWithCarePlan,
    highRiskMembers,
    activeMembersCount,
    graduationsCount,
    terminationsCount,
    unsignedIntakesCount,
    openTocCasesCount,
    membersForCnaDueDates,
    dischargedThisWeek,
    membersNeedingAssignment,
    membersForCcpDueDates,
    membersForContactCadence,
  ] = await Promise.all([
    db.member.count({ where: { clinicId } }),
    db.member.count({ where: { clinicId, cnaAssessments: { some: { status: "COMPLETED" } } } }),
    db.member.count({ where: { clinicId, hraAssessments: { some: { status: "COMPLETED" } } } }),
    db.member.count({ where: { clinicId, carePlans: { some: {} } } }),
    db.member.findMany({
      where: { clinicId, cclLevel: "HIGH_RISK" },
      select: { id: true, firstName: true, lastName: true, assignedCoordinator: { select: { name: true } } },
      take: 10,
    }),
    db.member.count({ where: { clinicId, status: "ACTIVE" } }),
    db.member.count({ where: { clinicId, status: "GRADUATED" } }),
    db.member.count({ where: { clinicId, status: "TERMED" } }),
    db.intakeVersion.count({ where: { member: { clinicId, deletedAt: null }, signedAt: null } }),
    db.tocRecord.count({ where: { member: { clinicId, deletedAt: null }, signedAt: null } }),
    db.member.findMany({
      where: { clinicId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedCoordinator: { select: { name: true } },
        cnaAssessments: {
          where: { status: "COMPLETED" },
          orderBy: { assessmentDate: "desc" },
          take: 1,
          select: { assessmentDate: true },
        },
      },
    }),
    db.memberStatusChange.findMany({
      where: {
        member: { clinicId, deletedAt: null },
        toStatus: { in: TERMINAL_STATUSES },
        approvedAt: { not: null },
        effectiveDate: { gte: weekStart },
      },
      orderBy: { effectiveDate: "desc" },
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    }),
    db.member.findMany({
      where: { clinicId, assignedCoordinatorId: null },
      select: { id: true, firstName: true, lastName: true, status: true },
    }),
    db.member.findMany({
      where: { clinicId, carePlans: { none: {} } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        assignedCoordinator: { select: { name: true } },
      },
    }),
    db.member.findMany({
      where: { clinicId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        program: true,
        assignedCoordinator: { select: { name: true } },
        generalCommunications: { where: { createdAt: { gte: contactFetchFloor } }, select: { createdAt: true, successful: true } },
        carePlans: {
          select: {
            goals: {
              select: {
                progressNotes: {
                  where: { track: "MEMBER", OR: [{ date: { gte: contactFetchFloor } }, { date: null, createdAt: { gte: contactFetchFloor } }] },
                  select: { date: true, createdAt: true },
                },
              },
            },
          },
        },
        intakeVersions: { where: { signedAt: { not: null } }, orderBy: { signedAt: "asc" }, take: 1, select: { signedAt: true } },
      },
    }),
  ]);

  const pct = (n: number) => (totalMembers === 0 ? 0 : Math.round((n / totalMembers) * 100));

  // Annual CNA due date = 12 months after the last completed one (never
  // completed = due immediately). "This quarter" uses the same current
  // calendar-quarter window as the dashboard's other quarterly signals.
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
  const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);

  const cnaDueRows = membersForCnaDueDates.map((m) => {
    const lastCnaDate = m.cnaAssessments[0]?.assessmentDate ?? null;
    const dueDate = lastCnaDate
      ? new Date(lastCnaDate.getFullYear() + 1, lastCnaDate.getMonth(), lastCnaDate.getDate())
      : null;
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      coordinatorName: m.assignedCoordinator?.name ?? "Unassigned",
      dueDate,
    };
  });

  const byDueDateAsc = (a: { dueDate: Date | null }, b: { dueDate: Date | null }) => {
    if (!a.dueDate) return -1;
    if (!b.dueDate) return 1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  };

  const annualCnaDueThisQuarter = cnaDueRows
    .filter((m) => m.dueDate && m.dueDate >= quarterStart && m.dueDate <= quarterEnd)
    .sort(byDueDateAsc);

  const annualCnaPastDue = cnaDueRows.filter((m) => !m.dueDate || m.dueDate < now).sort(byDueDateAsc);

  // CCP due date: a member's CCP is due 14 business days after enrollment
  // starts (chart creation) — a grace period, not an immediate overdue flag.
  // There's no renewal cadence — once a member has a CCP on file they're
  // off this list for good, so it shows a countdown ("N business days
  // left") before the deadline and "overdue" after it for members who
  // still don't have one.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdueCcps = membersForCcpDueDates
    .map((m) => {
      const enrollmentStart = new Date(m.createdAt.getFullYear(), m.createdAt.getMonth(), m.createdAt.getDate());
      const dueDate = addBusinessDays(enrollmentStart, INITIAL_CCP_DUE_BUSINESS_DAYS);
      const businessDaysLeft = businessDaysBetween(today, dueDate);
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        coordinatorName: m.assignedCoordinator?.name ?? "Unassigned",
        dueDate,
        businessDaysLeft,
        overdue: businessDaysLeft < 0,
      };
    })
    .sort((a, b) => a.businessDaysLeft - b.businessDaysLeft);

  // Touchpoint compliance is program-based: Prenatal/Postpartum members need
  // 1 successful contact (or 3 attempts) every month; GYN members need 1
  // successful contact (or 1 attempt) every month; everyone else needs 1
  // successful contact (or 3 attempts) every quarter, on a rolling 3-month
  // cycle counted from their own enrollment date. See
  // lib/touchpoint-compliance.ts.
  const touchpointGaps = membersForContactCadence
    .map((m) => {
      const contacts = [
        ...m.generalCommunications,
        ...progressNotesToContacts(m.carePlans.flatMap((cp) => cp.goals.flatMap((g) => g.progressNotes))),
      ];
      const cadence = getComplianceCadence(m.program);
      const enrollmentDate = firstEnrollmentDate(m);
      const windowStart = getWindowStart(cadence.unit, now, enrollmentDate);
      const inWindow = contacts.filter((c) => c.createdAt >= windowStart);
      const successfulInWindow = inWindow.filter((c) => c.successful).length;
      const lastAnyContact = contacts.reduce<Date | null>(
        (latest, c) => (!latest || c.createdAt > latest ? c.createdAt : latest),
        null
      );
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        coordinatorName: m.assignedCoordinator?.name ?? "Unassigned",
        cadenceUnit: cadence.unit,
        requiredAttempts: cadence.requiredAttempts,
        attemptsInWindow: inWindow.length,
        successfulInWindow,
        lastAnyContact,
        compliant: isTouchpointCompliant(contacts, m.program, enrollmentDate, now),
      };
    })
    .filter((m) => !m.compliant)
    .sort((a, b) => {
      if (!a.lastAnyContact) return -1;
      if (!b.lastAnyContact) return 1;
      return a.lastAnyContact.getTime() - b.lastAnyContact.getTime();
    });

  return {
    totalMembers,
    cnaCompletionPct: pct(membersWithCompletedCna),
    hraCompletionPct: pct(membersWithCompletedHra),
    carePlanCompletionPct: pct(membersWithCarePlan),
    highRiskMembers,
    activeMembersCount,
    graduationsCount,
    terminationsCount,
    draftOrUnsignedNotesCount: unsignedIntakesCount,
    openTocCasesCount,
    annualCnaDueThisQuarter,
    annualCnaPastDue,
    dischargedThisWeek,
    membersNeedingAssignment,
    overdueCcps,
    touchpointGaps,
  };
}
