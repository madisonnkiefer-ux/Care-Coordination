"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { CADENCE_PROGRAM_KEYS, type CadenceProgramKey } from "@/lib/touchpoint-compliance";

export type CadenceFormState = { error?: string } | undefined;

export async function setTouchpointCadence(
  program: CadenceProgramKey,
  _state: CadenceFormState,
  formData: FormData
): Promise<CadenceFormState> {
  const session = await requirePermission("MANAGE_TOUCHPOINT_CADENCE");

  if (!CADENCE_PROGRAM_KEYS.includes(program)) return { error: "Unknown program." };

  const unit = formData.get("unit");
  if (unit !== "month" && unit !== "quarter") return { error: "Choose a valid cadence unit." };

  const requiredSuccessful = Number(formData.get("requiredSuccessful"));
  const requiredAttempts = Number(formData.get("requiredAttempts"));
  if (!Number.isInteger(requiredSuccessful) || requiredSuccessful < 1) {
    return { error: "Required successful contacts must be at least 1." };
  }
  if (!Number.isInteger(requiredAttempts) || requiredAttempts < 1) {
    return { error: "Required attempts must be at least 1." };
  }

  await db.touchpointCadence.upsert({
    where: { clinicId_program: { clinicId: session.clinicId, program } },
    create: { clinicId: session.clinicId, program, unit, requiredSuccessful, requiredAttempts, updatedById: session.userId },
    update: { unit, requiredSuccessful, requiredAttempts, updatedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "TouchpointCadence",
    resourceId: program,
    metadata: { program, unit, requiredSuccessful, requiredAttempts },
  });

  revalidatePath("/settings");
  return undefined;
}

export async function resetTouchpointCadence(program: CadenceProgramKey) {
  const session = await requirePermission("MANAGE_TOUCHPOINT_CADENCE");

  await db.touchpointCadence.deleteMany({ where: { clinicId: session.clinicId, program } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "TouchpointCadence",
    resourceId: program,
    metadata: { program, resetToDefault: true },
  });

  revalidatePath("/settings");
}
