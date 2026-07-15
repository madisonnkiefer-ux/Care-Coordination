import "server-only";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function getDashboardData() {
  const session = await verifySession();

  const memberScope =
    session.role === "CARE_COORDINATOR"
      ? { clinicId: session.clinicId, assignedCoordinatorId: session.userId }
      : { clinicId: session.clinicId };

  const [
    myMemberCount,
    tasksDueCount,
    cnaDueCount,
    carePlansDueCount,
    myTasks,
    upcomingAppointments,
    goalCounts,
    recentTouchpoints,
  ] = await Promise.all([
    db.member.count({ where: memberScope }),
    db.task.count({
      where: { assigneeId: session.userId, status: "OPEN" },
    }),
    db.cnaAssessment.count({
      where: { status: "DRAFT", member: memberScope },
    }),
    db.carePlan.count({
      where: { member: memberScope },
    }),
    db.task.findMany({
      where: { assigneeId: session.userId, status: "OPEN" },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    }),
    db.appointment.findMany({
      where: { member: memberScope, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    }),
    db.carePlanGoal.groupBy({
      by: ["status"],
      where: { carePlan: { member: memberScope } },
      _count: true,
    }),
    db.touchpoint.findMany({
      where: { member: memberScope },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const goalTotals = { onTrack: 0, inProgress: 0, notStarted: 0, complete: 0 };
  for (const row of goalCounts) {
    if (row.status === "ON_TRACK") goalTotals.onTrack = row._count;
    if (row.status === "IN_PROGRESS") goalTotals.inProgress = row._count;
    if (row.status === "NOT_STARTED") goalTotals.notStarted = row._count;
    if (row.status === "COMPLETE") goalTotals.complete = row._count;
  }

  return {
    session,
    stats: {
      myMembers: myMemberCount,
      tasksDue: tasksDueCount,
      cnaDue: cnaDueCount,
      carePlansTracked: carePlansDueCount,
    },
    myTasks,
    upcomingAppointments,
    goalTotals,
    recentTouchpoints,
  };
}
