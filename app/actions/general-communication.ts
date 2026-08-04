"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function date(formData: FormData, key: string) {
  const v = str(formData, key);
  return v ? new Date(v) : null;
}

export async function createNewGeneralCommunication(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const record = await db.generalCommunication.create({
    data: { memberId, authorId: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "GeneralCommunication",
    resourceId: record.id,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
  return record.id;
}

export async function saveGeneralCommunication(memberId: string, commId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.generalCommunication.findUnique({ where: { id: commId } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");

  const successfulRaw = formData.get("successful");
  const successful = successfulRaw === "yes" ? true : successfulRaw === "no" ? false : null;

  await db.generalCommunication.update({
    where: { id: commId },
    data: {
      body: str(formData, "body"),
      contactMethod: str(formData, "contactMethod"),
      successful,
      unsuccessfulReason: successful === false ? str(formData, "unsuccessfulReason") : null,
      personContacted: str(formData, "personContacted"),
      nextAttemptDate: date(formData, "nextAttemptDate"),
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "GeneralCommunication",
    resourceId: commId,
  });

  // Flag the member the moment they cross 3 consecutive unsuccessful
  // attempts — fires once at the threshold, not again on every attempt
  // after, so it stays a signal rather than noise.
  if (successful === false) {
    const recent = await db.generalCommunication.findMany({
      where: { memberId, successful: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { successful: true },
    });
    let streak = 0;
    for (const c of recent) {
      if (c.successful === false) streak++;
      else break;
    }
    if (streak === 3 && member.assignedCoordinatorId) {
      await createNotification({
        clinicId: session.clinicId,
        userId: member.assignedCoordinatorId,
        actorId: session.userId,
        priority: "HIGH",
        title: `${member.firstName} ${member.lastName} has reached 3 unsuccessful contact attempts in a row`,
        memberId,
      });
    }
  }

  revalidatePath(`/members/${memberId}/care-plan`);
  revalidatePath("/members");
}
