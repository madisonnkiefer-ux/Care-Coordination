"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function markNotificationRead(notificationId: string) {
  const session = await verifySession();

  const existing = await db.notification.findUnique({ where: { id: notificationId } });
  if (!existing || existing.userId !== session.userId) throw new Error("Forbidden");

  if (!existing.read) {
    await db.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });
  }

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const session = await verifySession();

  await db.notification.updateMany({
    where: { userId: session.userId, read: false },
    data: { read: true, readAt: new Date() },
  });

  revalidatePath("/notifications");
}
