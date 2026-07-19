"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function updateMemberDetails(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  await db.member.update({
    where: { id: memberId },
    data: {
      subscriberId: str("subscriberId"),
      availityId: str("availityId"),
      provider: str("provider"),
      medicaidEligibilityVerified: formData.get("medicaidEligibilityVerified") === "on",
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Member",
    resourceId: memberId,
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
}
