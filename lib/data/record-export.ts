import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";

// The "designated record set" for a HIPAA right-to-access request: every
// clinical and care-coordination record tied to this member. Deliberately
// excludes internal system bookkeeping (audit logs, in-app notifications) —
// those aren't part of the patient's record, they're metadata about how the
// clinic's system operates.
export async function getFullMemberRecordForExport(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  return db.member.findUnique({
    where: { id: memberId },
    include: {
      assignedCoordinator: { select: { name: true, email: true } },
      demographicsRecords: true,
      hraAssessments: true,
      cnaAssessments: true,
      careCoordinationNotes: true,
      intakeVersions: { select: { id: true, createdAt: true, signedAt: true, signedBy: { select: { name: true } } } },
      carePlans: {
        include: { teamMembers: true, medications: true, backupContacts: true, disasterContacts: true, goals: { include: { progressNotes: true } } },
      },
      generalCommunications: true,
      hedisMeasures: true,
      tocRecords: { include: { needs: true } },
      tasks: true,
      touchpoints: true,
      appointments: true,
      notes: { include: { author: { select: { name: true } } } },
      documents: { select: { id: true, name: true, category: true, createdAt: true, uploadedBy: { select: { name: true } } } },
      statusChanges: true,
    },
  });
}
