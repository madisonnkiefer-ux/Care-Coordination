import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export async function getSupervisorData() {
  const session = await requireRole("SUPERVISOR", "ADMIN");
  const clinicId = session.clinicId;

  const [totalMembers, membersWithCompletedCna, membersWithCompletedHra, membersWithCarePlan, coordinators, highRiskMembers] =
    await Promise.all([
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

  return {
    totalMembers,
    cnaCompletionPct: pct(membersWithCompletedCna),
    hraCompletionPct: pct(membersWithCompletedHra),
    carePlanCompletionPct: pct(membersWithCarePlan),
    coordinatorStats,
    highRiskMembers,
  };
}
