import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { firstEnrollmentDate } from "@/lib/touchpoint-compliance";

export async function getGeneralCommunicationFormData(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const [records, firstSignedIntake] = await Promise.all([
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
  ]);

  await writeAuditLog({ userId: session.userId, memberId, action: "VIEW", resource: "GeneralCommunication", resourceId: memberId });

  const enrollmentDate = firstEnrollmentDate({ createdAt: member.createdAt, intakeVersions: firstSignedIntake ? [firstSignedIntake] : [] });

  return { member, records, enrollmentDate };
}
