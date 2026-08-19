"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function setBillingExclusion(memberId: string, formData: FormData) {
  const session = await requirePermission("VIEW_BILLING");

  const member = await db.member.findUnique({ where: { id: memberId }, select: { clinicId: true } });
  if (!member || member.clinicId !== session.clinicId) throw new Error("Forbidden");

  const excluded = formData.get("excluded") === "true";
  const reasonRaw = formData.get("reason");
  const reason = typeof reasonRaw === "string" && reasonRaw.trim() ? reasonRaw.trim() : null;

  await db.member.update({
    where: { id: memberId },
    data: { billingExcluded: excluded, billingExclusionReason: excluded ? reason : null },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Member",
    resourceId: memberId,
    metadata: { billingExcluded: excluded, billingExclusionReason: reason },
  });

  revalidatePath("/billing");
}
