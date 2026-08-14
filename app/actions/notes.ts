"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

// Freeform notes tagged to a patient — shown on the member's chart (to
// anyone with chart access) and on the author's Tasks & Reminders page as a
// personal reminder. Never part of any clinical form (intake/HRA/CNA/CCP).
export async function saveQuickNote(formData: FormData) {
  const memberId = String(formData.get("memberId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!memberId || !body) return;

  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

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
  revalidatePath("/tasks");
}
