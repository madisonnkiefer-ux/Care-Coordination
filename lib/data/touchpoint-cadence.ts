import "server-only";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import {
  CADENCE_PROGRAM_KEYS,
  DEFAULT_CADENCES,
  type CadenceOverrides,
  type CadenceProgramKey,
  type ComplianceUnit,
} from "@/lib/touchpoint-compliance";

// Called by every other server data loader that needs cadence-aware
// compliance math (dashboard, notifications, supervisor, patient snapshot,
// reports, general communication) — never permission-gated on its own,
// since each of those callers has already resolved its own session and
// this is just reading their clinic's saved overrides, same as any other
// internal helper.
export async function getCadenceOverridesForClinic(clinicId: string): Promise<CadenceOverrides> {
  const rows = await db.touchpointCadence.findMany({ where: { clinicId } });
  const overrides: CadenceOverrides = {};
  for (const r of rows) {
    if (!CADENCE_PROGRAM_KEYS.includes(r.program as CadenceProgramKey)) continue;
    overrides[r.program as CadenceProgramKey] = {
      unit: r.unit as ComplianceUnit,
      requiredSuccessful: r.requiredSuccessful,
      requiredAttempts: r.requiredAttempts,
    };
  }
  return overrides;
}

export type CadenceSettingsRow = {
  program: CadenceProgramKey;
  unit: ComplianceUnit;
  requiredSuccessful: number;
  requiredAttempts: number;
  isDefault: boolean;
};

// Settings > Touchpoint Cadence tab data.
export async function getTouchpointCadenceSettings(): Promise<CadenceSettingsRow[]> {
  const session = await requirePermission("MANAGE_TOUCHPOINT_CADENCE");
  const overrides = await getCadenceOverridesForClinic(session.clinicId);

  return CADENCE_PROGRAM_KEYS.map((program) => {
    const override = overrides[program];
    return { program, ...(override ?? DEFAULT_CADENCES[program]), isDefault: !override };
  });
}
