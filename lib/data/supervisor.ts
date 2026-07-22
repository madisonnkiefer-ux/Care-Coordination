import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export async function getSupervisorData() {
  const session = await requireRole("SUPERVISOR", "ADMIN");
  const clinicId = session.clinicId;

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
    draftDemographics,
    draftCna,
    draftHra,
    draftCcn,
    openTocCasesCount,
    membersForCnaDueDates,
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
    db.demographics.count({ where: { member: { clinicId }, OR: [{ status: "DRAFT" }, { signedAt: null }] } }),
    db.cnaAssessment.count({ where: { member: { clinicId }, OR: [{ status: "DRAFT" }, { signedAt: null }] } }),
    db.hraAssessment.count({ where: { member: { clinicId }, OR: [{ status: "DRAFT" }, { signedAt: null }] } }),
    db.careCoordinationNote.count({ where: { member: { clinicId }, OR: [{ status: "DRAFT" }, { signedAt: null }] } }),
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
  const now = new Date();
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
    draftOrUnsignedNotesCount: draftDemographics + draftCna + draftHra + draftCcn,
    openTocCasesCount,
    annualCnaDueThisQuarter,
    annualCnaPastDue,
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
