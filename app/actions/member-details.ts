"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import type { CclLevel } from "@/app/generated/prisma/client";

const CCL_LEVELS: CclLevel[] = ["CCL1", "CCL2", "CCL3", "HIGH_RISK"];

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

  await db.member.update({
    where: { id: memberId },
    data: {
      firstName,
      lastName,
      dateOfBirth,
      phone: str("phone"),
      medicaidId: str("medicaidId"),
      memberIdExternal: str("memberIdExternal"),
      language: str("language"),
      edd: date("edd"),
      cclLevel,
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

export async function updateMemberDetails(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  const medicaidEligibilityVerified = formData.get("medicaidEligibilityVerified") === "on";

  await db.member.update({
    where: { id: memberId },
    data: {
      memberIdExternal: str("memberIdExternal"),
      program: str("program"),
      subscriberId: str("subscriberId"),
      availityId: str("availityId"),
      insurancePlan: str("insurancePlan"),
      provider: str("provider"),
      medicaidEligibilityVerified,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Member",
    resourceId: memberId,
  });

  if (member.medicaidEligibilityVerified !== false && !medicaidEligibilityVerified && member.assignedCoordinatorId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: member.assignedCoordinatorId,
      actorId: session.userId,
      priority: "STANDARD",
      title: `Eligibility needs verification for ${member.firstName} ${member.lastName}`,
      memberId,
    });
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
}
