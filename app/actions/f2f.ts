"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function logF2FContact(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const raw = formData.get("contactDate");
  if (typeof raw !== "string" || !raw.trim()) throw new Error("Contact date is required.");
  const contactDate = new Date(raw);
  if (Number.isNaN(contactDate.getTime())) throw new Error("Invalid date.");

  const contact = await db.f2FContact.create({
    data: { memberId, contactDate, createdById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "F2FContact",
    resourceId: contact.id,
  });

  revalidatePath(`/members/${memberId}`);
}
