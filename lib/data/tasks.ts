import "server-only";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { listActiveCoordinators } from "@/lib/data/members";

export async function getTasksPageData() {
  const session = await verifySession();

  const memberScope =
    session.role === "CARE_COORDINATOR"
      ? { clinicId: session.clinicId, assignedCoordinatorId: session.userId }
      : { clinicId: session.clinicId };

  const [openTasks, completedTasks, notes, members, coordinators] = await Promise.all([
    db.task.findMany({
      where: { assigneeId: session.userId, status: "OPEN" },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    }),
    db.task.findMany({
      where: { assigneeId: session.userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    }),
    // This author's own notes across all their patients, as a personal
    // reminder feed — the member chart shows the full per-patient history
    // instead (see getMemberChart), never scoped to just one author.
    db.quickNote.findMany({
      where: { authorId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    }),
    db.member.findMany({
      where: memberScope,
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    session.role === "SUPERVISOR" || session.role === "ADMIN" ? listActiveCoordinators() : Promise.resolve([]),
  ]);

  return { session, openTasks, completedTasks, notes, members, coordinators };
}
