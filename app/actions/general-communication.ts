"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

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
  redirect(`/members/${memberId}/care-plan`);
}

export async function saveGeneralCommunication(memberId: string, commId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.generalCommunication.findUnique({ where: { id: commId } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");

  const body = formData.get("body");

  await db.generalCommunication.update({
    where: { id: commId },
    data: { body: typeof body === "string" && body.trim() ? body.trim() : null },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "GeneralCommunication",
    resourceId: commId,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
  redirect(`/members/${memberId}/care-plan`);
}
