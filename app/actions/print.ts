"use server";

import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export type PrintResource = "Member" | "IntakeVersion" | "CarePlan" | "TocRecord";

export async function logPrint(memberId: string, resource: PrintResource) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "PRINT",
    resource,
    resourceId: memberId,
  });
}
