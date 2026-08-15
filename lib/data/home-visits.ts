import "server-only";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { listActiveCoordinators } from "@/lib/data/members";

export async function getHomeVisitsPageData() {
  const session = await verifySession();
  const isSupervisor = session.role === "SUPERVISOR" || session.role === "ADMIN";

  const memberScope =
    session.role === "CARE_COORDINATOR"
      ? { clinicId: session.clinicId, assignedCoordinatorId: session.userId }
      : { clinicId: session.clinicId };

  const requestScope = isSupervisor ? { member: { clinicId: session.clinicId } } : { assignedCoordinatorId: session.userId };

  const visitScope = isSupervisor ? { member: { clinicId: session.clinicId } } : { coordinatorId: session.userId };

  const [openRequests, recentVisits, members, coordinators] = await Promise.all([
    db.homeVisitRequest.findMany({
      where: { status: "OPEN", ...requestScope },
      orderBy: { createdAt: "asc" },
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
