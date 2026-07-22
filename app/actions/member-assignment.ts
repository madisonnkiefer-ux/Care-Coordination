"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function reassignMember(memberId: string, formData: FormData) {
  const session = await requireRole("SUPERVISOR", "ADMIN");

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member || member.clinicId !== session.clinicId) throw new Error("Forbidden");

  const raw = formData.get("coordinatorId");
  const newCoordinatorId = typeof raw === "string" && raw ? raw : null;

  await db.member.update({ where: { id: memberId }, data: { assignedCoordinatorId: newCoordinatorId } });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Member",
    resourceId: memberId,
    metadata: { previousCoordinatorId: member.assignedCoordinatorId, newCoordinatorId },
  });

  if (newCoordinatorId && newCoordinatorId !== member.assignedCoordinatorId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: newCoordinatorId,
      actorId: session.userId,
      priority: "STANDARD",
      title: `You've been assigned ${member.firstName} ${member.lastName}`,
      memberId,
    });
  }

  revalidatePath("/supervisor");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
}
