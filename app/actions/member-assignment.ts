"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { isTerminalStatus } from "@/lib/member-status";

export async function reassignMember(memberId: string, formData: FormData) {
  const session = await requireRole("SUPERVISOR", "ADMIN");

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member || member.clinicId !== session.clinicId) throw new Error("Forbidden");

  const raw = formData.get("coordinatorId");
  const newCoordinatorId = typeof raw === "string" && raw ? raw : null;

  // A member's first-ever coordinator assignment starts their billing clock —
  // mark them Active right away rather than waiting on someone to remember
  // to flip it manually. Only fires on the Unassigned -> assigned transition
  // (not later transfers between coordinators) and never overrides a
  // terminal status (Declined/Termed/etc.) a member may already be in.
  const autoActivate =
    member.assignedCoordinatorId === null &&
    newCoordinatorId !== null &&
    member.status !== "ACTIVE" &&
    !isTerminalStatus(member.status);

  await db.member.update({
    where: { id: memberId },
    data: { assignedCoordinatorId: newCoordinatorId, ...(autoActivate ? { status: "ACTIVE" } : {}) },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Member",
    resourceId: memberId,
    metadata: { previousCoordinatorId: member.assignedCoordinatorId, newCoordinatorId, autoActivated: autoActivate },
  });

  if (autoActivate) {
    const change = await db.memberStatusChange.create({
      data: {
        memberId,
        fromStatus: member.status,
        toStatus: "ACTIVE",
        effectiveDate: new Date(),
        reason: "Automatically marked Active upon care coordinator assignment",
        changedById: session.userId,
        requiresApproval: false,
        approvedById: session.userId,
        approvedAt: new Date(),
      },
    });

    await writeAuditLog({
      userId: session.userId,
      memberId,
      action: "UPDATE",
      resource: "MemberStatusChange",
      resourceId: change.id,
      metadata: { fromStatus: member.status, toStatus: "ACTIVE", automatic: true },
    });

    const supervisorsAndAdmins = await db.user.findMany({
      where: { clinicId: session.clinicId, role: { in: ["SUPERVISOR", "ADMIN"] }, active: true },
      select: { id: true },
    });
    for (const s of supervisorsAndAdmins) {
      await createNotification({
        clinicId: session.clinicId,
        userId: s.id,
        actorId: session.userId,
        priority: "STANDARD",
        title: `${member.firstName} ${member.lastName} automatically marked Active (assigned to a coordinator)`,
        memberId,
      });
    }
  }

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
