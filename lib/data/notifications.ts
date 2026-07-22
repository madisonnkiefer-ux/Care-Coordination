import "server-only";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";

// Counts only — this runs on every page via the persistent layout, so it
// deliberately avoids the full dashboard query (goal totals, appointments,
// member lists, etc.) and just computes the three "needs attention" numbers.
async function getNeedsAttentionCounts(session: { userId: string; clinicId: string; role: string }) {
  const memberScope =
    session.role === "CARE_COORDINATOR"
      ? { clinicId: session.clinicId, assignedCoordinatorId: session.userId }
      : { clinicId: session.clinicId };

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);

  const [tasksDueCount, membersForAnnualCna, membersForContactCheck] = await Promise.all([
    db.task.count({ where: { assigneeId: session.userId, status: "OPEN" } }),
    db.member.findMany({
      where: memberScope,
      select: {
        id: true,
        cnaAssessments: {
          where: { status: "COMPLETED" },
          orderBy: { assessmentDate: "desc" },
          take: 1,
          select: { assessmentDate: true },
        },
      },
    }),
    db.member.findMany({
      where: memberScope,
      select: {
        id: true,
        generalCommunications: {
          where: { successful: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
  ]);

  const annualCnaDueCount = membersForAnnualCna.filter((m) => {
    const lastCnaDate = m.cnaAssessments[0]?.assessmentDate ?? null;
    const dueDate = lastCnaDate
      ? new Date(lastCnaDate.getFullYear() + 1, lastCnaDate.getMonth(), lastCnaDate.getDate())
      : null;
    return !dueDate || dueDate <= endOfMonth;
  }).length;

  const notContactedThisQuarterCount = membersForContactCheck.filter((m) => {
    const lastSuccessfulContactDate = m.generalCommunications[0]?.createdAt ?? null;
    return !lastSuccessfulContactDate || lastSuccessfulContactDate < quarterStart;
  }).length;

  return { tasksDueCount, annualCnaDueCount, notContactedThisQuarterCount };
}

export async function getNotificationBellData() {
  const session = await verifySession();

  const [unreadCount, recent, needsAttention] = await Promise.all([
    db.notification.count({ where: { userId: session.userId, read: false } }),
    db.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    }),
    getNeedsAttentionCounts(session),
  ]);

  return { unreadCount, recent, needsAttention };
}

export async function getAllNotifications() {
  const session = await verifySession();

  return db.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { member: { select: { id: true, firstName: true, lastName: true } } },
  });
}
