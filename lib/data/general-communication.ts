import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { firstEnrollmentDate, progressNotesToContacts } from "@/lib/touchpoint-compliance";
import { getCadenceOverridesForClinic } from "@/lib/data/touchpoint-cadence";

export async function getGeneralCommunicationFormData(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const [records, firstSignedIntake, latestCna, cadenceOverrides, progressNotes] = await Promise.all([
    db.generalCommunication.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    }),
    db.intakeVersion.findFirst({
      where: { memberId, signedAt: { not: null } },
      orderBy: { signedAt: "asc" },
      select: { signedAt: true },
    }),
    db.cnaAssessment.findFirst({
      where: { memberId, status: "COMPLETED" },
      orderBy: { assessmentDate: "desc" },
      select: { assessmentDate: true },
    }),
    getCadenceOverridesForClinic(session.clinicId),
    // "Member Progress Updates" notes on this member's care plan goals count
    // as a successful touchpoint too (see lib/touchpoint-compliance.ts) —
    // every other compliance surface (Supervisor Dashboard, Reports, the
    // under-contacted notification check) already folds these in; this tab
    // was the one place still judging compliance off General Communication
    // entries alone, so a member contacted only via progress notes showed
    // as non-compliant here while showing compliant everywhere else.
    db.carePlanProgressNote.findMany({
      where: { track: "MEMBER", goal: { carePlan: { memberId } } },
      select: { date: true, createdAt: true },
    }),
  ]);

  await writeAuditLog({ userId: session.userId, memberId, action: "VIEW", resource: "GeneralCommunication", resourceId: memberId });

  const enrollmentDate = firstEnrollmentDate({ createdAt: member.createdAt, intakeVersions: firstSignedIntake ? [firstSignedIntake] : [] });

  return {
    member,
    records,
    enrollmentDate,
    cadenceOverrides,
    lastCnaCompletedDate: latestCna?.assessmentDate ?? null,
    progressNoteContacts: progressNotesToContacts(progressNotes),
  };
}
