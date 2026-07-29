"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import type { Demographics, CnaAssessment, HraAssessment, CareCoordinationNote } from "@/app/generated/prisma/client";

// Drops identifiers, lock/status state, and timestamps so a "+ New Intake"
// can carry forward the rest of a section's answers into the fresh record.
function carryForwardDemographics(prev: Demographics | null | undefined) {
  if (!prev) return {};
  const { id, memberId, assessorId, status, intakeVersionId, createdAt, updatedAt, ...rest } = prev;
  return rest;
}

function carryForwardCna(prev: CnaAssessment | null | undefined) {
  if (!prev) return {};
  const { id, memberId, assessorId, status, intakeVersionId, createdAt, updatedAt, assessmentDate, ...rest } = prev;
  return rest;
}

function carryForwardHra(prev: HraAssessment | null | undefined) {
  if (!prev) return {};
  const { id, memberId, assessorId, status, intakeVersionId, createdAt, updatedAt, assessmentDate, ...rest } = prev;
  return rest;
}

function carryForwardNote(prev: CareCoordinationNote | null | undefined) {
  if (!prev) return {};
  const { id, memberId, assessorId, status, intakeVersionId, createdAt, updatedAt, ...rest } = prev;
  return rest;
}

export async function createNewIntakeVersion(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const latest = await db.intakeVersion.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { demographics: true, cna: true, hra: true, note: true },
  });

  const record = await db.intakeVersion.create({
    data: {
      memberId,
      demographics: { create: { memberId, assessorId: session.userId, ...carryForwardDemographics(latest?.demographics) } },
      cna: { create: { memberId, assessorId: session.userId, ...carryForwardCna(latest?.cna) } },
      hra: { create: { memberId, assessorId: session.userId, ...carryForwardHra(latest?.hra) } },
      note: { create: { memberId, assessorId: session.userId, ...carryForwardNote(latest?.note) } },
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "IntakeVersion",
    resourceId: record.id,
  });

  revalidatePath(`/members/${memberId}/intake`);
  redirect(`/members/${memberId}/intake`);
}

export async function signIntakeVersion(memberId: string, intakeVersionId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");
  if (session.role !== "ADMIN") throw new Error("Forbidden: only admins can sign");

  const existing = await db.intakeVersion.findUnique({
    where: { id: intakeVersionId },
    include: { demographics: true, cna: true, hra: true, note: true },
  });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");
  if (existing.signedAt) throw new Error("Already signed");

  const sections = [existing.demographics, existing.hra, existing.cna, existing.note];
  if (sections.some((s) => !s || s.status !== "COMPLETED")) {
    throw new Error("Demographics, HRA, CNA, and Care Coordination Notes must all be marked Completed before the intake can be signed.");
  }

  await db.intakeVersion.update({ where: { id: intakeVersionId }, data: { signedAt: new Date(), signedById: session.userId } });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "IntakeVersion",
    resourceId: intakeVersionId,
    metadata: { signed: true },
  });

  if (member.assignedCoordinatorId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: member.assignedCoordinatorId,
      actorId: session.userId,
      priority: "HIGH",
      title: `Intake signed off for ${member.firstName} ${member.lastName}`,
      memberId,
    });
  }

  revalidatePath(`/members/${memberId}/intake`);
  redirect(`/members/${memberId}/intake`);
}
