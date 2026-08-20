"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function requestHomeVisit(formData: FormData) {
  const session = await verifySession();

  const memberId = str(formData, "memberId");
  if (!memberId) throw new Error("Member is required.");

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member || member.clinicId !== session.clinicId) throw new Error("Forbidden");

  const canAssignToOthers = session.permissions.includes("ASSIGN_WORK_TO_OTHERS");
  let assignedCoordinatorId = session.userId;

  if (canAssignToOthers) {
    const requested = str(formData, "assignedCoordinatorId");
    if (requested) {
      const coordinator = await db.user.findUnique({ where: { id: requested } });
      if (!coordinator || coordinator.clinicId !== session.clinicId) throw new Error("Forbidden");
      assignedCoordinatorId = requested;
    }
  } else if (member.assignedCoordinatorId !== session.userId) {
    // Care coordinators can only request a visit for their own members.
    throw new Error("Forbidden");
  }

  const reason = str(formData, "reason");

  const request = await db.homeVisitRequest.create({
    data: { memberId, assignedCoordinatorId, requestedById: session.userId, reason },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "HomeVisitRequest",
    resourceId: request.id,
  });

  if (assignedCoordinatorId !== session.userId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: assignedCoordinatorId,
      actorId: session.userId,
      priority: "STANDARD",
      title: `${session.name} requested a home visit for ${member.firstName} ${member.lastName}`,
      memberId,
      linkPath: "/home-visits",
    });
  }

  revalidatePath("/home-visits");
}

export async function cancelHomeVisitRequest(requestId: string) {
  const session = await verifySession();

  const request = await db.homeVisitRequest.findUnique({ where: { id: requestId }, include: { member: true } });
  if (!request || request.member.clinicId !== session.clinicId) throw new Error("Forbidden");

  const canAssignToOthers = session.permissions.includes("ASSIGN_WORK_TO_OTHERS");
  if (!canAssignToOthers && request.assignedCoordinatorId !== session.userId && request.requestedById !== session.userId) {
    throw new Error("Forbidden");
  }

  await db.homeVisitRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId: request.memberId,
    action: "UPDATE",
    resource: "HomeVisitRequest",
    resourceId: request.id,
    metadata: { status: "CANCELLED" },
  });

  revalidatePath("/home-visits");
}

export async function logHomeVisit(formData: FormData) {
  const session = await verifySession();

  const memberId = str(formData, "memberId");
  if (!memberId) throw new Error("Member is required.");

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member || member.clinicId !== session.clinicId) throw new Error("Forbidden");

  const visitedAtRaw = str(formData, "visitedAt");
  const successfulRaw = formData.get("successful");
  const successful = successfulRaw === "yes" ? true : successfulRaw === "no" ? false : null;
  const personContacted = str(formData, "personContacted");
  const leftCardOrNoteRaw = formData.get("leftCardOrNote");
  const leftCardOrNote = leftCardOrNoteRaw === "yes" ? true : leftCardOrNoteRaw === "no" ? false : null;
  const notes = str(formData, "notes");

  const visit = await db.$transaction(async (tx) => {
    const visit = await tx.homeVisit.create({
      data: {
        memberId,
        coordinatorId: session.userId,
        visitedAt: visitedAtRaw ? new Date(visitedAtRaw) : new Date(),
        successful,
        personContacted,
        leftCardOrNote,
        notes,
      },
    });

    // Logging the visit *is* fulfilling any matching open request — no need
    // to make the coordinator explicitly pick which one they're closing out.
    const openRequest = await tx.homeVisitRequest.findFirst({
      where: { memberId, assignedCoordinatorId: session.userId, status: "OPEN" },
      orderBy: { createdAt: "asc" },
    });
    if (openRequest) {
      await tx.homeVisitRequest.update({
        where: { id: openRequest.id },
        data: { status: "FULFILLED", resolvedAt: new Date(), fulfilledByVisitId: visit.id },
      });
    }

    return visit;
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "HomeVisit",
    resourceId: visit.id,
  });

  revalidatePath("/home-visits");
}
