"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import type { TaskPriority } from "@/app/generated/prisma/client";

export async function createTask(formData: FormData) {
  const session = await verifySession();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const memberId = String(formData.get("memberId") ?? "") || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const priority = (String(formData.get("priority") ?? "MEDIUM") as TaskPriority) ?? "MEDIUM";
  const returnPath = String(formData.get("returnPath") ?? "/tasks");

  if (memberId) {
    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member || member.clinicId !== session.clinicId) {
      throw new Error("Forbidden");
    }
  }

  // Only a supervisor/admin can assign a task to someone other than
  // themselves — a care coordinator submitting an assigneeId is ignored,
  // same server-side backstop pattern used for member assignment.
  const requestedAssigneeId = String(formData.get("assigneeId") ?? "") || null;
  let assigneeId = session.userId;
  if (requestedAssigneeId && requestedAssigneeId !== session.userId && session.permissions.includes("ASSIGN_WORK_TO_OTHERS")) {
    const assignee = await db.user.findUnique({ where: { id: requestedAssigneeId } });
    if (!assignee || assignee.clinicId !== session.clinicId) {
      throw new Error("Forbidden");
    }
    assigneeId = requestedAssigneeId;
  }

  const task = await db.task.create({
    data: {
      title,
      memberId,
      assigneeId,
      priority,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "Task",
    resourceId: task.id,
  });

  if (assigneeId !== session.userId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: assigneeId,
      actorId: session.userId,
      priority: "STANDARD",
      title: `${session.name} assigned you a task: ${title}`,
      memberId,
      linkPath: "/tasks",
    });
  }

  revalidatePath(returnPath);
  revalidatePath("/");
}

export async function toggleTask(taskId: string, returnPath: string) {
  const session = await verifySession();

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.assigneeId !== session.userId) {
    throw new Error("Forbidden");
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data:
      task.status === "OPEN"
        ? { status: "COMPLETED", completedAt: new Date() }
        : { status: "OPEN", completedAt: null },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId: task.memberId,
    action: "UPDATE",
    resource: "Task",
    resourceId: task.id,
    metadata: { status: updated.status },
  });

  revalidatePath(returnPath);
}
