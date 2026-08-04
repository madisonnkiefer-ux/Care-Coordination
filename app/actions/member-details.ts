"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function updateMemberDetails(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  const medicaidEligibilityVerified = formData.get("medicaidEligibilityVerified") === "on";

  await db.member.update({
    where: { id: memberId },
    data: {
      memberIdExternal: str("memberIdExternal"),
      program: str("program"),
      subscriberId: str("subscriberId"),
      availityId: str("availityId"),
      insurancePlan: str("insurancePlan"),
      provider: str("provider"),
      medicaidEligibilityVerified,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Member",
    resourceId: memberId,
  });

  if (member.medicaidEligibilityVerified !== false && !medicaidEligibilityVerified && member.assignedCoordinatorId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: member.assignedCoordinatorId,
      actorId: session.userId,
      priority: "STANDARD",
      title: `Eligibility needs verification for ${member.firstName} ${member.lastName}`,
      memberId,
    });
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
}
