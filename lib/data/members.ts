import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { verifySession, authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function listMembers() {
  const session = await verifySession();

  const members = await db.member.findMany({
    where: { clinicId: session.clinicId },
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
      memberIdExternal: true,
      subscriberId: true,
      availityId: true,
      medicaidEligibilityVerified: true,
      edd: true,
      provider: true,
      assignedCoordinatorId: true,
      assignedCoordinator: { select: { name: true } },
      demographicsRecords: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { medicaidEligibilityRenewalDate: true },
      },
      cnaAssessments: {
        where: { status: "COMPLETED" },
        orderBy: { assessmentDate: "desc" },
        select: { assessmentDate: true, assessmentType: true },
      },
      carePlans: {
        select: { ccpStartDate: true, createdAt: true, updatedAt: true },
      },
      generalCommunications: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, contactMethod: true },
      },
    },
  });

  return members.map((m) => {
    const mostRecentCna = m.cnaAssessments[0] ?? null;
    const initialCna = m.cnaAssessments[m.cnaAssessments.length - 1] ?? null;

    const sortedCarePlans = [...m.carePlans].sort(
      (a, b) => (a.ccpStartDate ?? a.createdAt).getTime() - (b.ccpStartDate ?? b.createdAt).getTime()
    );
    const initialCcpStartDate = sortedCarePlans[0]?.ccpStartDate ?? sortedCarePlans[0]?.createdAt ?? null;
    const lastCcpUpdatedAt = m.carePlans.length
      ? new Date(Math.max(...m.carePlans.map((cp) => cp.updatedAt.getTime())))
      : null;

    const lastInPersonContact = m.generalCommunications.find((c) => c.contactMethod === "In Person")?.createdAt ?? null;

    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      dateOfBirth: m.dateOfBirth,
      status: m.status,
      cclLevel: m.cclLevel,
      program: m.program,
      medicaidId: m.medicaidId,
      chartId: m.memberIdExternal,
      subscriberId: m.subscriberId,
      availityId: m.availityId,
      medicaidEligibilityVerified: m.medicaidEligibilityVerified,
      medicaidEligibilityRenewalDate: m.demographicsRecords[0]?.medicaidEligibilityRenewalDate ?? null,
      dueDate: m.edd,
      provider: m.provider,
      assignedCoordinatorId: m.assignedCoordinatorId,
      assignedCoordinator: m.assignedCoordinator,
      lastContactDate: m.generalCommunications[0]?.createdAt ?? null,
      lastInPersonTouchpointDate: lastInPersonContact,
      initialCnaDate: initialCna?.assessmentDate ?? null,
      mostRecentCnaDate: mostRecentCna?.assessmentDate ?? null,
      mostRecentCnaType: mostRecentCna?.assessmentType[0] ?? null,
      initialCcpStartDate,
      lastCcpUpdatedAt,
    };
  });
}

export async function listActiveCoordinators() {
  const session = await verifySession();
  return db.user.findMany({
    where: { clinicId: session.clinicId, role: "CARE_COORDINATOR", active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// Fetches everything the Member Chart overview needs, enforces
// clinic/coordinator-scoped authorization, and records a VIEW audit event —
// this is the PHI record-level "who looked at this chart, and when" trail.
export async function getMemberChart(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) notFound();

  const [tasks, recentContacts, appointments, documents, goalCounts, latestCarePlan] =
    await Promise.all([
      db.task.findMany({ where: { memberId }, orderBy: { dueDate: "asc" }, take: 6 }),
      db.generalCommunication.findMany({
        where: { memberId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { name: true } } },
      }),
      db.appointment.findMany({
        where: { memberId, startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 3,
      }),
      db.document.findMany({ where: { memberId }, orderBy: { createdAt: "desc" }, take: 5 }),
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
    recentContacts,
    appointments,
    documents,
    goalTotals,
    latestCarePlanId: latestCarePlan?.id ?? null,
  };
}
