"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { DocumentCategory } from "@/app/generated/prisma/client";

export async function saveDocument(memberId: string, params: { name: string; category: DocumentCategory; url: string }) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const document = await db.document.create({
    data: {
      memberId,
      uploadedById: session.userId,
      name: params.name,
      category: params.category,
      storageKey: params.url,
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

  revalidatePath(`/members/${memberId}`);
}
