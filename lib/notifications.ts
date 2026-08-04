import "server-only";
import { db } from "@/lib/db";
import type { NotificationPriority } from "@/app/generated/prisma/client";

// Fire-and-forget notification creation, called from within server actions
// after the triggering event has actually happened (document uploaded,
// record signed, etc.) — mirrors the writeAuditLog helper's role for audit
// entries. Never notifies a user about their own action.
export async function createNotification(params: {
  clinicId: string;
  userId: string;
  actorId?: string | null;
  priority: NotificationPriority;
  title: string;
  body?: string;
  memberId?: string | null;
  linkPath?: string;
}) {
  if (params.actorId && params.actorId === params.userId) return;

  await db.notification.create({
    data: {
      clinicId: params.clinicId,
      userId: params.userId,
      priority: params.priority,
      title: params.title,
      body: params.body,
      memberId: params.memberId ?? null,
      linkPath: params.linkPath,
    },
  });
}
