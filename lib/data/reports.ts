import "server-only";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { firstEnrollmentDate, progressNotesToContacts } from "@/lib/touchpoint-compliance";

export async function getReportsData() {
  const session = await requirePermission("VIEW_REPORTS");
  const clinicId = session.clinicId;

  await writeAuditLog({
    userId: session.userId,
    action: "VIEW",
    resource: "ReportsData",
  });

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
        createdAt: true,
        cnaAssessments: {
          where: { status: "COMPLETED" },
          orderBy: { assessmentDate: "desc" },
          select: { assessmentDate: true, assessmentType: true },
        },
        generalCommunications: {
          select: { createdAt: true, successful: true },
        },
        carePlans: {
          select: {
            goals: {
              select: {
                progressNotes: {
                  where: { track: "MEMBER" },
                  select: { date: true, createdAt: true },
                },
              },
            },
          },
        },
        intakeVersions: { where: { signedAt: { not: null } }, orderBy: { signedAt: "asc" }, take: 1, select: { signedAt: true } },
      },
    }),
    db.user.findMany({
      where: { clinicId, role: "CARE_COORDINATOR", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const reportMembers = members.map((m) => {
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
      lastCnaDate: mostRecentCna?.assessmentDate ?? null,
      lastCnaType: mostRecentCna?.assessmentType[0] ?? null,
      cnaCompletions: m.cnaAssessments.map((c) => c.assessmentDate),
      contacts: [
        ...m.generalCommunications,
        ...progressNotesToContacts(m.carePlans.flatMap((cp) => cp.goals.flatMap((g) => g.progressNotes))),
      ],
      enrollmentDate: firstEnrollmentDate(m),
    };
  });

  const programs = Array.from(new Set(reportMembers.map((m) => m.program).filter((p): p is string => Boolean(p)))).sort();

  return { members: reportMembers, coordinators, programs };
}
