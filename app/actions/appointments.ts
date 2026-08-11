"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function createAppointment(memberId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  if (!title || !startsAtRaw) return;

  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const location = String(formData.get("location") ?? "").trim() || null;
  const isVirtual = formData.get("isVirtual") === "on";

  const appointment = await db.appointment.create({
    data: {
      memberId,
      title,
      location,
      startsAt: new Date(startsAtRaw),
      isVirtual,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "Appointment",
    resourceId: appointment.id,
  });

  revalidatePath(`/members/${memberId}`);
}
