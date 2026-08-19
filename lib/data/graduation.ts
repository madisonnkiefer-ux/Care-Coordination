import "server-only";
import { db } from "@/lib/db";
import { requirePermission, authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { graduationReviewStatus } from "@/lib/graduation";

// Single-member graduation info for the member chart's alert card and the
// patient snapshot panel. Returns null when there's nothing to show (no
// delivery date on file, or the review status is NOT_DUE/REVIEWED).
export async function getMemberGraduationInfo(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const hedis = await db.hedisMeasures.findUnique({ where: { memberId }, select: { deliveryDate: true } });
  if (!hedis?.deliveryDate) return null;

  const reviewStatus = graduationReviewStatus({ deliveryDate: hedis.deliveryDate, status: member.status });
  if (reviewStatus !== "UPCOMING" && reviewStatus !== "OVERDUE") return null;

  return {
    deliveryDate: hedis.deliveryDate,
    status: member.status,
    assignedCoordinatorName: member.assignedCoordinator?.name ?? "Unassigned",
    reviewStatus,
  };
}

// Clinic-wide list for the Supervisor Dashboard's Upcoming Graduations card.
// Includes every member with a delivery date on file whose review status is
// UPCOMING or OVERDUE (REVIEWED/NOT_DUE members are left out — nothing for a
// supervisor to act on there).
export async function getUpcomingGraduations() {
  const session = await requirePermission("VIEW_SUPERVISOR_DASHBOARD");
  const clinicId = session.clinicId;

  await writeAuditLog({
    userId: session.userId,
    action: "VIEW",
    resource: "UpcomingGraduations",
  });

  const members = await db.member.findMany({
    where: { clinicId, hedisMeasures: { deliveryDate: { not: null } } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      status: true,
      medicaidEligibilityVerified: true,
      assignedCoordinatorId: true,
      assignedCoordinator: { select: { id: true, name: true } },
      hedisMeasures: { select: { deliveryDate: true } },
      statusChanges: {
        where: { requiresApproval: true, approvedAt: null, rejectedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { toStatus: true },
      },
    },
  });

  const rows = members
    .map((m) => {
      const deliveryDate = m.hedisMeasures!.deliveryDate!;
      const reviewStatus = graduationReviewStatus({ deliveryDate, status: m.status });
      return { m, deliveryDate, reviewStatus };
    })
    .filter((r) => r.reviewStatus === "UPCOMING" || r.reviewStatus === "OVERDUE")
    .map(({ m, deliveryDate, reviewStatus }) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      dateOfBirth: m.dateOfBirth,
      deliveryDate,
      status: m.status,
      eligibilityVerified: m.medicaidEligibilityVerified,
      coordinatorId: m.assignedCoordinatorId,
      coordinatorName: m.assignedCoordinator?.name ?? "Unassigned",
      reviewStatus: reviewStatus as "UPCOMING" | "OVERDUE",
      pendingRequestToStatus: m.statusChanges[0]?.toStatus ?? null,
    }))
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());

  return rows;
}
