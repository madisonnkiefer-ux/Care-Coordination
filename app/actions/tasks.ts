"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
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

  const task = await db.task.create({
    data: {
      title,
      memberId,
      assigneeId: session.userId,
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

  revalidatePath(returnPath);
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
