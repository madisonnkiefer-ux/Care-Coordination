"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function createResource(formData: FormData) {
  const session = await requireRole("ADMIN", "SUPERVISOR");

  const name = str(formData, "name");
  if (!name) return;

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
  const session = await requireRole("ADMIN", "SUPERVISOR");

  const name = str(formData, "name");
  if (!name) return;

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
  const session = await requireRole("ADMIN", "SUPERVISOR");

  await db.resourceEntry.delete({ where: { id: resourceId } });

  await writeAuditLog({
    userId: session.userId,
    action: "DELETE",
    resource: "ResourceEntry",
    resourceId,
  });

  revalidatePath("/resources");
}
