"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { GoalStatus } from "@/app/generated/prisma/client";

async function ensureCarePlan(memberId: string, userId: string) {
  const existing = await db.carePlan.findFirst({ where: { memberId }, orderBy: { createdAt: "desc" } });
  if (existing) return existing;
  return db.carePlan.create({ data: { memberId, createdById: userId } });
}

export async function addGoal(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const targetDateRaw = String(formData.get("targetDate") ?? "");

  const carePlan = await ensureCarePlan(memberId, session.userId);

  const goal = await db.carePlanGoal.create({
    data: {
      carePlanId: carePlan.id,
      title,
      description,
      targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "CarePlanGoal",
    resourceId: goal.id,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
}

export async function updateGoalStatus(memberId: string, goalId: string, status: GoalStatus) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  await db.carePlanGoal.update({ where: { id: goalId }, data: { status } });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "CarePlanGoal",
    resourceId: goalId,
    metadata: { status },
  });

  revalidatePath(`/members/${memberId}/care-plan`);
  revalidatePath(`/members/${memberId}`);
}
