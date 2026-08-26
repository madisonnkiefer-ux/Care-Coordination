"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { CclLevel } from "@/app/generated/prisma/client";
import { PATIENT_TYPE_OPTIONS } from "@/lib/patient-type";

// Includes CCL3/HIGH_RISK even though the picker no longer offers them — an
// existing member already on one of those values still needs to be able to
// save other Overview edits without that value getting rejected.
const CCL_LEVELS: CclLevel[] = ["CCL0", "CCL1", "CCL2", "CCL3", "CCL4", "CCL5", "HIGH_RISK"];
const PATIENT_TYPES = PATIENT_TYPE_OPTIONS.map((o) => o.value);

// Everything collected on the "Add New Patient" form, editable afterward
// from the chart's Overview card — for any role with access to the chart.
// Deliberately excludes status (its own approval-gated workflow — see
// MemberStatusCard) and assignedCoordinatorId (its own supervisor/admin-only
// reassignment flow — see the Supervisor Dashboard caseload table) so this
// doesn't create a backdoor around either.
export async function updateMemberOverview(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  const date = (key: string) => {
    const value = str(key);
    return value ? new Date(value) : null;
  };

  const firstName = str("firstName");
  const lastName = str("lastName");
  const dateOfBirth = date("dateOfBirth");
  if (!firstName || !lastName || !dateOfBirth) {
    throw new Error("First name, last name, and date of birth are required.");
  }

  const cclLevelRaw = str("cclLevel");
  const cclLevel = cclLevelRaw && CCL_LEVELS.includes(cclLevelRaw as CclLevel) ? (cclLevelRaw as CclLevel) : null;

  const programRaw = str("program");
  const program = programRaw && PATIENT_TYPES.includes(programRaw) ? programRaw : null;

  await db.member.update({
    where: { id: memberId },
    data: {
      firstName,
      lastName,
      dateOfBirth,
      phone: str("phone"),
      medicaidId: str("medicaidId"),
      memberIdExternal: str("memberIdExternal"),
      subscriberId: str("subscriberId"),
      language: str("language"),
      edd: date("edd"),
      cclLevel,
      program,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Member",
    resourceId: memberId,
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
}
