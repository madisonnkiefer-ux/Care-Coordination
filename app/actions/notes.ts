"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function saveQuickNote(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const note = await db.quickNote.create({
    data: { memberId, authorId: session.userId, body },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "QuickNote",
    resourceId: note.id,
  });

  revalidatePath(`/members/${memberId}`);
}
