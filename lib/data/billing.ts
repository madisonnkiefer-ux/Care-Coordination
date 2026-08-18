import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { computeBillingEligibility } from "@/lib/billing";

// Billing roster for the Supervisor Billing section. Enrollment/termination/
// graduation dates aren't stored fields — they're derived from data that
// already exists (earliest enrollment paperwork, and the most recent
// approved status change to Termed/Graduated), same philosophy as the rest
// of the app's "derive, don't duplicate" data layer (see patient-snapshot.ts).
export async function getBillingRoster() {
  const session = await requireRole("SUPERVISOR", "ADMIN");
  const clinicId = session.clinicId;

  await writeAuditLog({
    userId: session.userId,
    action: "VIEW",
    resource: "BillingRoster",
    metadata: { clinicId },
  });

  const [members, coordinators] = await Promise.all([
    db.member.findMany({
      where: { clinicId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        address: true,
        phone: true,
        insurancePlan: true,
        medicaidId: true,
        subscriberId: true,
        status: true,
        medicaidEligibilityVerified: true,
        billingExcluded: true,
        billingExclusionReason: true,
        createdAt: true,
        assignedCoordinator: { select: { id: true, name: true } },
        intakeVersions: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
        statusChanges: {
          where: { toStatus: { in: ["TERMED", "GRADUATED"] }, approvedAt: { not: null } },
          orderBy: { effectiveDate: "desc" },
          select: { toStatus: true, effectiveDate: true },
        },
      },
    }),
    db.user.findMany({
      where: { clinicId, role: "CARE_COORDINATOR", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = members.map((m) => {
    const enrollmentDate = m.intakeVersions[0]?.createdAt ?? m.createdAt;
    const terminationDate = m.statusChanges.find((c) => c.toStatus === "TERMED")?.effectiveDate ?? null;
    const graduationDate = m.statusChanges.find((c) => c.toStatus === "GRADUATED")?.effectiveDate ?? null;
    const { eligible, reason } = computeBillingEligibility(m);

    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      dateOfBirth: m.dateOfBirth,
      address: m.address,
      phone: m.phone,
      insurancePlan: m.insurancePlan,
      medicaidId: m.medicaidId,
      subscriberId: m.subscriberId,
      status: m.status,
      eligibilityVerified: m.medicaidEligibilityVerified,
      enrollmentDate,
      terminationDate,
      graduationDate,
      coordinatorId: m.assignedCoordinator?.id ?? null,
      coordinatorName: m.assignedCoordinator?.name ?? "Unassigned",
      billingExcluded: m.billingExcluded,
      billingEligible: eligible,
      billingExclusionReason: reason,
    };
  });

  const insurancePlans = Array.from(new Set(rows.map((r) => r.insurancePlan).filter((v): v is string => Boolean(v)))).sort();

  return { rows, coordinators, insurancePlans };
}
