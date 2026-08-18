"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import type { DocumentCategory } from "@/app/generated/prisma/client";

export async function saveDocument(memberId: string, params: { name: string; category: DocumentCategory; key: string }) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const document = await db.document.create({
    data: {
      memberId,
      uploadedById: session.userId,
      name: params.name,
      category: params.category,
      storageKey: params.key,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "Document",
    resourceId: document.id,
    metadata: { name: params.name, category: params.category },
  });

  if (member.assignedCoordinatorId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: member.assignedCoordinatorId,
      actorId: session.userId,
      priority: "STANDARD",
      title: `New document uploaded for ${member.firstName} ${member.lastName}`,
      body: params.name,
      memberId,
    });
  }

  revalidatePath(`/members/${memberId}`);
}
