"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

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

  revalidatePath(`/members/${memberId}/care-plan`);
  revalidatePath("/members");
}
