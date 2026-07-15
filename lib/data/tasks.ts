import "server-only";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function getTasksPageData() {
  const session = await verifySession();

  const memberScope =
    session.role === "CARE_COORDINATOR"
      ? { clinicId: session.clinicId, assignedCoordinatorId: session.userId }
      : { clinicId: session.clinicId };

  const [openTasks, completedTasks, members] = await Promise.all([
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
    db.member.findMany({
      where: memberScope,
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return { session, openTasks, completedTasks, members };
}
