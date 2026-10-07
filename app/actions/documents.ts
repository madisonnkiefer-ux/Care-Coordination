"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sanitizeUploadFilename, kindForStorageKey, verifyUploadedFile } from "@/lib/uploads";
import type { DocumentCategory } from "@/app/generated/prisma/client";

export async function saveDocument(memberId: string, params: { name: string; category: DocumentCategory; key: string }) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  // The presigned-upload flow always issues a key scoped to this member
  // (app/api/documents/upload/route.ts), but this action is a directly
  // callable network entry point — without this check, a caller who has
  // legitimate upload access to two different members could link one
  // member's real uploaded file into a different member's chart just by
  // supplying its key here.
  if (!params.key.startsWith(`${memberId}/`)) throw new Error("Forbidden");

  // The key's extension is server-generated (randomStorageKey), never
  // caller-controlled, so it's a trustworthy source for which signature to
  // check the object's actual bytes against.
  const kind = kindForStorageKey(params.key);
  if (!kind || !(await verifyUploadedFile(params.key, kind))) {
    throw new Error("That file isn't a valid upload.");
  }

  const name = sanitizeUploadFilename(params.name, kind);

  const document = await db.document.create({
    data: {
      memberId,
      uploadedById: session.userId,
      name,
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
    metadata: { name, category: params.category },
  });

  if (member.assignedCoordinatorId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: member.assignedCoordinatorId,
      actorId: session.userId,
      priority: "STANDARD",
      title: `New document uploaded for ${member.firstName} ${member.lastName}`,
      body: name,
      memberId,
    });
  }

  revalidatePath(`/members/${memberId}`);
}
