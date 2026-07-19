import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { verifySession, authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function listMembers() {
  const session = await verifySession();

  const where =
    session.role === "CARE_COORDINATOR"
      ? { clinicId: session.clinicId, assignedCoordinatorId: session.userId }
      : { clinicId: session.clinicId };

  return db.member.findMany({
    where,
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      status: true,
      cclLevel: true,
      program: true,
      medicaidId: true,
      assignedCoordinator: { select: { name: true } },
    },
  });
}

// Fetches everything the Member Chart overview needs, enforces
// clinic/coordinator-scoped authorization, and records a VIEW audit event —
// this is the PHI record-level "who looked at this chart, and when" trail.
export async function getMemberChart(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) notFound();

  const [tasks, touchpoints, appointments, documents, notes, goalCounts, latestCarePlan] =
    await Promise.all([
      db.task.findMany({ where: { memberId }, orderBy: { dueDate: "asc" }, take: 6 }),
      db.touchpoint.findMany({
        where: { memberId },
        orderBy: { date: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
      db.appointment.findMany({
        where: { memberId, startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 3,
      }),
      db.document.findMany({ where: { memberId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.quickNote.findFirst({ where: { memberId }, orderBy: { updatedAt: "desc" } }),
      db.carePlanGoal.groupBy({
        by: ["status"],
        where: { carePlan: { memberId } },
        _count: true,
      }),
      db.carePlan.findFirst({ where: { memberId }, orderBy: { createdAt: "desc" } }),
    ]);

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "VIEW",
    resource: "Member",
    resourceId: memberId,
  });

  const goalTotals = { onTrack: 0, inProgress: 0, notStarted: 0, complete: 0 };
  for (const row of goalCounts) {
    if (row.status === "ON_TRACK") goalTotals.onTrack = row._count;
    if (row.status === "IN_PROGRESS") goalTotals.inProgress = row._count;
    if (row.status === "NOT_STARTED") goalTotals.notStarted = row._count;
    if (row.status === "COMPLETE") goalTotals.complete = row._count;
  }

  return {
    session,
    member,
    tasks,
    touchpoints,
    appointments,
    documents,
    notes,
    goalTotals,
    latestCarePlanId: latestCarePlan?.id ?? null,
  };
}
