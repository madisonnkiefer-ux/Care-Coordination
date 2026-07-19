import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export async function getReportsData() {
  const session = await requireRole("SUPERVISOR", "ADMIN");
  const clinicId = session.clinicId;

  const [members, coordinators] = await Promise.all([
    db.member.findMany({
      where: { clinicId },
      orderBy: { lastName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        program: true,
        cclLevel: true,
        medicaidId: true,
        memberIdExternal: true,
        assignedCoordinatorId: true,
        assignedCoordinator: { select: { id: true, name: true } },
        carePlans: {
          select: { ccpStartDate: true, createdAt: true, updatedAt: true },
        },
        cnaAssessments: {
          where: { status: "COMPLETED" },
          orderBy: { assessmentDate: "desc" },
          select: { assessmentDate: true, assessmentType: true },
        },
        generalCommunications: {
          select: { createdAt: true, successful: true },
        },
      },
    }),
    db.user.findMany({
      where: { clinicId, role: "CARE_COORDINATOR", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const reportMembers = members.map((m) => {
    const sortedCarePlans = [...m.carePlans].sort(
      (a, b) => (a.ccpStartDate ?? a.createdAt).getTime() - (b.ccpStartDate ?? b.createdAt).getTime()
    );
    const ccpStartDate = sortedCarePlans[0]?.ccpStartDate ?? sortedCarePlans[0]?.createdAt ?? null;
    const ccpLastUpdated = m.carePlans.length
      ? new Date(Math.max(...m.carePlans.map((cp) => cp.updatedAt.getTime())))
      : null;
    const mostRecentCna = m.cnaAssessments[0] ?? null;

    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      status: m.status,
      program: m.program,
      cclLevel: m.cclLevel,
      medicaidId: m.medicaidId,
      chartId: m.memberIdExternal,
      coordinatorId: m.assignedCoordinatorId,
      coordinatorName: m.assignedCoordinator?.name ?? null,
      hasCarePlan: m.carePlans.length > 0,
      ccpStartDate,
      ccpLastUpdated,
      lastCnaDate: mostRecentCna?.assessmentDate ?? null,
      lastCnaType: mostRecentCna?.assessmentType[0] ?? null,
      contacts: m.generalCommunications,
    };
  });

  const programs = Array.from(new Set(reportMembers.map((m) => m.program).filter((p): p is string => Boolean(p)))).sort();

  return { members: reportMembers, coordinators, programs };
}
