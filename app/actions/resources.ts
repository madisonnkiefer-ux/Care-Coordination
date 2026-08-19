"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// The presigned-upload route (app/api/resources/upload/route.ts) always
// issues a key scoped to the caller's own clinic — this re-verifies it
// before linking, the same defense used in app/actions/documents.ts, so a
// tampered key can't attach another clinic's uploaded file to this one's
// resource directory.
function requireOwnDocumentKey(formData: FormData, clinicId: string) {
  const key = str(formData, "documentKey");
  if (!key) return { documentKey: null, documentName: null };
  if (!key.startsWith(`resources/${clinicId}/`)) throw new Error("Forbidden");
  return { documentKey: key, documentName: str(formData, "documentName") };
}

export async function createResource(formData: FormData) {
  const session = await requirePermission("MANAGE_RESOURCES");

  const name = str(formData, "name");
  if (!name) return;

  const { documentKey, documentName } = requireOwnDocumentKey(formData, session.clinicId);

  const resource = await db.resourceEntry.create({
    data: {
      clinicId: session.clinicId,
      createdById: session.userId,
      name,
      category: str(formData, "category") ?? "Other",
      description: str(formData, "description"),
      contactName: str(formData, "contactName"),
      contactPhone: str(formData, "contactPhone"),
      contactEmail: str(formData, "contactEmail"),
      eligibility: str(formData, "eligibility"),
      notes: str(formData, "notes"),
      documentKey,
      documentName,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "CREATE",
    resource: "ResourceEntry",
    resourceId: resource.id,
  });

  revalidatePath("/resources");
}

export async function updateResource(resourceId: string, formData: FormData) {
  const session = await requirePermission("MANAGE_RESOURCES");

  const target = await db.resourceEntry.findUnique({ where: { id: resourceId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  const name = str(formData, "name");
  if (!name) return;

  // Three states for the attachment: a new key means replace it, the
  // "removeDocument" flag means clear it, otherwise leave whatever's
  // already on the record untouched.
  const uploaded = requireOwnDocumentKey(formData, session.clinicId);
  const removeDocument = formData.get("removeDocument") === "true";
  const documentFields = uploaded.documentKey
    ? uploaded
    : removeDocument
      ? { documentKey: null, documentName: null }
      : {};

  await db.resourceEntry.update({
    where: { id: resourceId },
    data: {
      name,
      category: str(formData, "category") ?? "Other",
      description: str(formData, "description"),
      contactName: str(formData, "contactName"),
      contactPhone: str(formData, "contactPhone"),
      contactEmail: str(formData, "contactEmail"),
      eligibility: str(formData, "eligibility"),
      notes: str(formData, "notes"),
      ...documentFields,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "ResourceEntry",
    resourceId,
  });

  revalidatePath("/resources");
}

export async function deleteResource(resourceId: string) {
  const session = await requirePermission("MANAGE_RESOURCES");

  const target = await db.resourceEntry.findUnique({ where: { id: resourceId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  await db.resourceEntry.delete({ where: { id: resourceId } });

  await writeAuditLog({
    userId: session.userId,
    action: "DELETE",
    resource: "ResourceEntry",
    resourceId,
  });

  revalidatePath("/resources");
}
