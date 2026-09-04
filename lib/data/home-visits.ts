import "server-only";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { listActiveCoordinators } from "@/lib/data/members";

export async function getHomeVisitsPageData() {
  const session = await verifySession();
  const isSupervisor = session.role === "SUPERVISOR" || session.role === "ADMIN";

  await writeAuditLog({
    userId: session.userId,
    action: "VIEW",
    resource: "HomeVisitsPage",
  });

  const memberScope =
    session.role === "CARE_COORDINATOR"
      ? { clinicId: session.clinicId, assignedCoordinatorId: session.userId }
      : { clinicId: session.clinicId };

  const requestScope = isSupervisor
    ? { member: { clinicId: session.clinicId, deletedAt: null } }
    : { assignedCoordinatorId: session.userId, member: { deletedAt: null } };

  const visitScope = isSupervisor
    ? { member: { clinicId: session.clinicId, deletedAt: null } }
    : { coordinatorId: session.userId, member: { deletedAt: null } };

  const [openRequests, recentVisits, members, coordinators] = await Promise.all([
    db.homeVisitRequest.findMany({
      where: { status: "OPEN", ...requestScope },
      // Overdue (past due date) first, then soonest-due, then oldest
      // undated requests — surfaces what needs attention before what's
      // merely been waiting longest.
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        assignedCoordinator: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    }),
    db.homeVisit.findMany({
      where: visitScope,
      orderBy: { visitedAt: "desc" },
      take: 50,
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        coordinator: { select: { id: true, name: true } },
      },
    }),
    db.member.findMany({
      where: memberScope,
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    isSupervisor ? listActiveCoordinators() : Promise.resolve([]),
  ]);

  return { session, openRequests, recentVisits, members, coordinators };
}
