import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { TERMINAL_STATUSES } from "@/lib/member-status";

export async function getSupervisorData() {
  const session = await requireRole("SUPERVISOR", "ADMIN");
  const clinicId = session.clinicId;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [
    totalMembers,
    membersWithCompletedCna,
    membersWithCompletedHra,
    membersWithCarePlan,
    coordinators,
    highRiskMembers,
    declinationsCount,
    graduationsCount,
    terminationsCount,
    unsignedIntakesCount,
    openTocCasesCount,
    membersForCnaDueDates,
    dischargedThisWeek,
    membersNeedingAssignment,
    membersForCcpDueDates,
    membersForContactCadence,
    membersForSuccessfulContact,
  ] = await Promise.all([
    db.member.count({ where: { clinicId } }),
    db.member.count({ where: { clinicId, cnaAssessments: { some: { status: "COMPLETED" } } } }),
    db.member.count({ where: { clinicId, hraAssessments: { some: { status: "COMPLETED" } } } }),
    db.member.count({ where: { clinicId, carePlans: { some: {} } } }),
    db.user.findMany({
      where: { clinicId, role: "CARE_COORDINATOR", active: true },
      select: {
        id: true,
        name: true,
        assignedMembers: {
          select: {
            id: true,
            cnaAssessments: { where: { status: "COMPLETED" }, select: { id: true }, take: 1 },
          },
        },
      },
    }),
    db.member.findMany({
      where: { clinicId, cclLevel: "HIGH_RISK" },
      select: { id: true, firstName: true, lastName: true, assignedCoordinator: { select: { name: true } } },
      take: 10,
    }),
    db.member.count({ where: { clinicId, status: "DECLINED" } }),
    db.member.count({ where: { clinicId, status: "GRADUATED" } }),
    db.member.count({ where: { clinicId, status: "TERMED" } }),
    db.intakeVersion.count({ where: { member: { clinicId }, signedAt: null } }),
    db.tocRecord.count({ where: { member: { clinicId }, signedAt: null } }),
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
        member: { clinicId },
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
      where: { clinicId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedCoordinator: { select: { name: true } },
        carePlans: { orderBy: { createdAt: "desc" }, take: 1, select: { ccpStartDate: true, createdAt: true } },
      },
    }),
    db.member.findMany({
      where: { clinicId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedCoordinator: { select: { name: true } },
        generalCommunications: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
    db.member.findMany({
      where: { clinicId },
      select: {
        id: true,
        generalCommunications: { where: { successful: true }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
  ]);

  const coordinatorStats = coordinators.map((c) => {
    const total = c.assignedMembers.length;
    const completed = c.assignedMembers.filter((m) => m.cnaAssessments.length > 0).length;
    return {
      id: c.id,
      name: c.name,
      total,
      completed,
      pct: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });

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

  // Overdue CCP mirrors the same "annual renewal" cadence as CNA: no care
  // plan at all, or the most recent one is over 12 months old.
  const overdueCcps = membersForCcpDueDates
    .map((m) => {
      const latest = m.carePlans[0];
      const lastCcpDate = latest ? (latest.ccpStartDate ?? latest.createdAt) : null;
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        coordinatorName: m.assignedCoordinator?.name ?? "Unassigned",
        lastCcpDate,
      };
    })
    .filter((m) => !m.lastCcpDate || m.lastCcpDate < oneYearAgo)
    .sort((a, b) => {
      if (!a.lastCcpDate) return -1;
      if (!b.lastCcpDate) return 1;
      return a.lastCcpDate.getTime() - b.lastCcpDate.getTime();
    });

  // "Touchpoint" = any logged contact attempt (successful or not) — nobody
  // has even tried reaching them in 30+ days. "No contact" is the stricter
  // signal: no *successful* contact in 30+ days, even if attempts were made.
  const successfulContactById = new Map(
    membersForSuccessfulContact.map((m) => [m.id, m.generalCommunications[0]?.createdAt ?? null])
  );

  const contactCadenceRows = membersForContactCadence.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    coordinatorName: m.assignedCoordinator?.name ?? "Unassigned",
    lastAnyContact: m.generalCommunications[0]?.createdAt ?? null,
    lastSuccessfulContact: successfulContactById.get(m.id) ?? null,
  }));

  const touchpointsOverdue = contactCadenceRows
    .filter((m) => !m.lastAnyContact || m.lastAnyContact < thirtyDaysAgo)
    .sort((a, b) => {
      if (!a.lastAnyContact) return -1;
      if (!b.lastAnyContact) return 1;
      return a.lastAnyContact.getTime() - b.lastAnyContact.getTime();
    });

  const noContact30Days = contactCadenceRows
    .filter((m) => !m.lastSuccessfulContact || m.lastSuccessfulContact < thirtyDaysAgo)
    .sort((a, b) => {
      if (!a.lastSuccessfulContact) return -1;
      if (!b.lastSuccessfulContact) return 1;
      return a.lastSuccessfulContact.getTime() - b.lastSuccessfulContact.getTime();
    });

  return {
    totalMembers,
    cnaCompletionPct: pct(membersWithCompletedCna),
    hraCompletionPct: pct(membersWithCompletedHra),
    carePlanCompletionPct: pct(membersWithCarePlan),
    coordinatorStats,
    highRiskMembers,
    declinationsCount,
    graduationsCount,
    terminationsCount,
    draftOrUnsignedNotesCount: unsignedIntakesCount,
    openTocCasesCount,
    annualCnaDueThisQuarter,
    annualCnaPastDue,
    dischargedThisWeek,
    membersNeedingAssignment,
    overdueCcps,
    touchpointsOverdue,
    noContact30Days,
  };
}

export async function getCaseloadForReassignment() {
  const session = await requireRole("SUPERVISOR", "ADMIN");
  const clinicId = session.clinicId;

  const [members, coordinators] = await Promise.all([
    db.member.findMany({
      where: { clinicId },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true, assignedCoordinatorId: true },
    }),
    db.user.findMany({
      where: { clinicId, role: "CARE_COORDINATOR", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { members, coordinators };
}
