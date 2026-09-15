import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { evaluateCclSchedule, hasCclSchedule, type CclContactRecord, type CclScheduleTask } from "@/lib/ccl-cadence";
import { progressNotesToContacts } from "@/lib/touchpoint-compliance";

export type CclScheduleData = {
  cclLevel: "CCL1" | "CCL2";
  anchorDate: Date | null;
  tasks: CclScheduleTask[] | null;
};

// Settings > Care Plan's read-only "CCL Schedule" tab — surfaces the
// BCBSNM DCCE Tasking Tool's day-offset schedule (see lib/ccl-cadence.ts)
// computed live from this member's own data, instead of a spreadsheet a
// coordinator has to maintain by hand. Returns null for any member not on
// CCL1 or CCL2 — that tool has no schedule defined for other levels.
export async function getCclScheduleData(memberId: string): Promise<CclScheduleData | null> {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member || !hasCclSchedule(member.cclLevel)) return null;

  const now = new Date();

  // Every CNA on file, not just the most recent — the earliest COMPLETED
  // one is this cycle's anchor, and the rest (including DRAFT ones) are
  // what the Schedule/Complete CNA tasks match against.
  const cnaAssessments = await db.cnaAssessment.findMany({
    where: { memberId },
    orderBy: { assessmentDate: "desc" },
    select: { assessmentDate: true, status: true },
  });
  const anchorDate = cnaAssessments.find((c) => c.status === "COMPLETED")?.assessmentDate ?? null;

  await writeAuditLog({ userId: session.userId, memberId, action: "VIEW", resource: "CclSchedule", resourceId: memberId });

  if (!anchorDate) {
    return { cclLevel: member.cclLevel, anchorDate: null, tasks: null };
  }

  const [generalComm, progressNotes, homeVisits] = await Promise.all([
    db.generalCommunication.findMany({
      where: { memberId, createdAt: { gte: anchorDate } },
      select: { createdAt: true, successful: true, contactMethod: true },
    }),
    db.carePlanProgressNote.findMany({
      where: { track: "MEMBER", goal: { carePlan: { memberId } }, OR: [{ date: { gte: anchorDate } }, { date: null, createdAt: { gte: anchorDate } }] },
      select: { date: true, createdAt: true },
    }),
    db.homeVisit.findMany({
      where: { memberId, visitedAt: { gte: anchorDate } },
      select: { visitedAt: true, successful: true },
    }),
  ]);

  const contacts: CclContactRecord[] = [
    ...generalComm.map((c) => ({ createdAt: c.createdAt, successful: c.successful, inPerson: c.contactMethod === "In Person" })),
    ...progressNotesToContacts(progressNotes).map((c) => ({ ...c, inPerson: false })),
    ...homeVisits.map((v) => ({ createdAt: v.visitedAt, successful: v.successful, inPerson: true })),
  ];

  const cnaRecords = cnaAssessments.map((c) => ({ assessmentDate: c.assessmentDate, status: c.status }));

  const tasks = evaluateCclSchedule(member.cclLevel, anchorDate, now, contacts, cnaRecords);

  return { cclLevel: member.cclLevel, anchorDate, tasks };
}
