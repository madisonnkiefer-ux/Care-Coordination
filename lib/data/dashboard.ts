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
    recentContacts,
    membersForAnnualCna,
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
    db.generalCommunication.findMany({
      where: { member: memberScope },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        author: { select: { name: true } },
      },
    }),
    db.member.findMany({
      where: memberScope,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        cnaAssessments: {
          where: { status: "COMPLETED" },
          orderBy: { assessmentDate: "desc" },
          take: 1,
          select: { assessmentDate: true },
        },
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

  // Annual CNA is due 12 months after the last completed one. "Due this
  // month" includes anything already overdue, plus members who have never
  // had a completed CNA (most urgent — sorted first).
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const annualCnaDue = membersForAnnualCna
    .map((m) => {
      const lastCnaDate = m.cnaAssessments[0]?.assessmentDate ?? null;
      const dueDate = lastCnaDate
        ? new Date(lastCnaDate.getFullYear() + 1, lastCnaDate.getMonth(), lastCnaDate.getDate())
        : null;
      return { id: m.id, firstName: m.firstName, lastName: m.lastName, lastCnaDate, dueDate };
    })
    .filter((m) => !m.dueDate || m.dueDate <= endOfMonth)
    .sort((a, b) => {
      if (!a.dueDate) return -1;
      if (!b.dueDate) return 1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

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
    recentContacts,
    annualCnaDue,
  };
}
