import "server-only";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { firstEnrollmentDate, isTouchpointCompliant, progressNotesToContacts } from "@/lib/touchpoint-compliance";
import { getCadenceOverridesForClinic } from "@/lib/data/touchpoint-cadence";

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
  // Widest window either cadence ever needs, regardless of a member's own
  // enrollment anchor: a monthly cadence never looks back further than the
  // start of this month, and an anchored quarter is always fully contained
  // within the last 3 calendar months.
  const contactFetchFloor = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  // Both counts scan the same member scope, so this is one table scan with
  // both nested includes rather than two — it ran as two separate
  // db.member.findMany calls before, doubling the cost of a query that
  // already fires on every page navigation via the persistent layout.
  const [tasksDueCount, members, cadenceOverrides] = await Promise.all([
    db.task.count({ where: { assigneeId: session.userId, status: "OPEN" } }),
    db.member.findMany({
      where: memberScope,
      select: {
        id: true,
        createdAt: true,
        program: true,
        cnaAssessments: {
          where: { status: "COMPLETED" },
          orderBy: { assessmentDate: "desc" },
          take: 1,
          select: { assessmentDate: true },
        },
        generalCommunications: {
          where: { createdAt: { gte: contactFetchFloor } },
          select: { createdAt: true, successful: true },
        },
        carePlans: {
          select: {
            goals: {
              select: {
                progressNotes: {
                  where: { track: "MEMBER", OR: [{ date: { gte: contactFetchFloor } }, { date: null, createdAt: { gte: contactFetchFloor } }] },
                  select: { date: true, createdAt: true },
                },
              },
            },
          },
        },
        intakeVersions: { where: { signedAt: { not: null } }, orderBy: { signedAt: "asc" }, take: 1, select: { signedAt: true } },
      },
    }),
    getCadenceOverridesForClinic(session.clinicId),
  ]);

  const annualCnaDueCount = members.filter((m) => {
    const lastCnaDate = m.cnaAssessments[0]?.assessmentDate ?? null;
    const dueDate = lastCnaDate
      ? new Date(lastCnaDate.getFullYear() + 1, lastCnaDate.getMonth(), lastCnaDate.getDate())
      : null;
    return !dueDate || dueDate <= endOfMonth;
  }).length;

  // Touchpoint compliance is program-based — see lib/touchpoint-compliance.ts.
  const touchpointGapCount = members.filter((m) => {
    const contacts = [
      ...m.generalCommunications,
      ...progressNotesToContacts(m.carePlans.flatMap((cp) => cp.goals.flatMap((g) => g.progressNotes))),
    ];
    return !isTouchpointCompliant(contacts, m.program, firstEnrollmentDate(m), now, cadenceOverrides);
  }).length;

  return { tasksDueCount, annualCnaDueCount, touchpointGapCount };
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
