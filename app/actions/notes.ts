"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

// Personal reminders tagged to a patient — shown only on the author's Tasks
// & Reminders page, never on the member's chart or in any clinical form.
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

  revalidatePath("/tasks");
}
