import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { authorizeMemberAccess } from "@/lib/dal";

// Requests aren't resolved by editing the underlying versioned record in
// place; a supervisor/admin accepts or denies the request here, and any
// resulting correction happens through the normal chart workflow. See
// lib/amendment-requests-shared.ts for the 60-day response-clock constant.

export async function getAmendmentRequestsForMember(memberId: string) {
  const { member } = await authorizeMemberAccess(memberId);
  if (!member) return [];

  return db.amendmentRequest.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
      resolvedBy: { select: { name: true } },
    },
  });
}

// Clinic-wide view for the Settings > Patient Rights tab, so open requests
// don't get missed just because nobody happens to be on that member's chart.
export async function getAllAmendmentRequests() {
  const session = await requireRole("ADMIN");

  return db.amendmentRequest.findMany({
    where: { member: { clinicId: session.clinicId } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: {
      member: { select: { id: true, firstName: true, lastName: true } },
      requestedBy: { select: { name: true } },
      resolvedBy: { select: { name: true } },
    },
  });
}

// Full-record releases (right-to-access fulfillments), read off the audit
// trail — this is the HIPAA accounting-of-disclosures view.
export async function getRecordExportLog() {
  const session = await requireRole("ADMIN");

  return db.auditLog.findMany({
    where: { action: "EXPORT", resource: "MemberRecordExport", user: { clinicId: session.clinicId } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true } },
      member: { select: { firstName: true, lastName: true } },
    },
  });
}
