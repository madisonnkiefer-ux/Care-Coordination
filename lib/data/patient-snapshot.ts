import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";

// Everything here is derived from data that already exists elsewhere in the
// app (Care Plan, General Communication, Tasks, HEDIS, CNA) — nothing new is
// stored just for this panel, so it can never drift out of sync with the
// forms coordinators already fill out.
export async function getPatientSnapshot(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const now = new Date();

  const [latestCarePlan, lastAnyContact, lastSuccessfulContact, openTasksCount, hedis, latestCna, pendingStatusChange] =
    await Promise.all([
      db.carePlan.findFirst({
        where: { memberId },
        orderBy: { createdAt: "desc" },
        include: { goals: true },
      }),
      db.generalCommunication.findFirst({ where: { memberId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      db.generalCommunication.findFirst({
        where: { memberId, successful: true },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.task.count({ where: { memberId, status: "OPEN" } }),
      db.hedisMeasures.findUnique({ where: { memberId }, select: { deliveryDate: true } }),
      db.cnaAssessment.findFirst({
        where: { memberId, status: "COMPLETED" },
        orderBy: { assessmentDate: "desc" },
        select: { assessmentDate: true },
      }),
      db.memberStatusChange.findFirst({
        where: { memberId, requiresApproval: true, approvedAt: null, rejectedAt: null },
        select: { toStatus: true },
      }),
    ]);

  // Pregnancy/postpartum status — reuses Member.edd and the HEDIS tab's
  // Delivery Date rather than introducing new fields.
  let pregnancy: { kind: "pregnant"; weeks: number; edd: Date } | { kind: "postpartum"; weeks: number } | null = null;
  if (hedis?.deliveryDate && hedis.deliveryDate <= now) {
    const weeksSince = Math.floor((now.getTime() - hedis.deliveryDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    pregnancy = { kind: "postpartum", weeks: weeksSince };
  } else if (member.edd) {
    const weeksUntilDue = Math.ceil((member.edd.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
    pregnancy = { kind: "pregnant", weeks: Math.min(42, Math.max(0, 40 - weeksUntilDue)), edd: member.edd };
  }

  // CCP due date mirrors the same annual-renewal logic used on the
  // Supervisor Dashboard's "Overdue CCPs" card.
  const ccpReferenceDate = latestCarePlan ? (latestCarePlan.ccpStartDate ?? latestCarePlan.createdAt) : null;
  const ccpDueDate = ccpReferenceDate
    ? new Date(ccpReferenceDate.getFullYear() + 1, ccpReferenceDate.getMonth(), ccpReferenceDate.getDate())
    : null;

  // Next touchpoint due mirrors the dashboard's "not contacted in 30 days"
  // cadence — 30 days after the last successful contact.
  const nextTouchpointDue = lastSuccessfulContact
    ? new Date(lastSuccessfulContact.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  const activeGoals = latestCarePlan?.goals.filter((g) => g.status !== "COMPLETE") ?? [];
  const topBarriers = Array.from(
    new Set(activeGoals.map((g) => g.barriers).filter((b): b is string => Boolean(b && b.trim())))
  ).slice(0, 3);

  // Annual CNA due mirrors the same logic used elsewhere in the app.
  const cnaDueDate = latestCna
    ? new Date(latestCna.assessmentDate.getFullYear() + 1, latestCna.assessmentDate.getMonth(), latestCna.assessmentDate.getDate())
    : null;

  const alerts: { text: string; level: "high" | "warning" }[] = [];
  if (member.cclLevel === "HIGH_RISK") alerts.push({ text: "High Risk", level: "high" });
  if (pendingStatusChange) alerts.push({ text: `Status change to ${pendingStatusChange.toStatus.replaceAll("_", " ")} pending approval`, level: "warning" });
  if (!cnaDueDate || cnaDueDate < now) alerts.push({ text: cnaDueDate ? "Annual CNA overdue" : "CNA never completed", level: "warning" });
  if (!ccpDueDate || ccpDueDate < now) alerts.push({ text: ccpDueDate ? "CCP overdue" : "No care plan on file", level: "warning" });
  else if (ccpDueDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) alerts.push({ text: "CCP due within 7 days", level: "warning" });
  if (!lastSuccessfulContact || lastSuccessfulContact.createdAt < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) {
    alerts.push({ text: lastSuccessfulContact ? "No successful contact in 30+ days" : "Never successfully contacted", level: "warning" });
  }
  if (member.medicaidEligibilityVerified === false) alerts.push({ text: "Eligibility unverified", level: "warning" });

  return {
    session,
    member: { id: member.id, firstName: member.firstName, lastName: member.lastName },
    pregnancy,
    nextTouchpointDue,
    ccpDueDate,
    lastContactDate: lastAnyContact?.createdAt ?? null,
    ccpLastUpdated: latestCarePlan?.updatedAt ?? null,
    activeGoalsCount: activeGoals.length,
    topBarriers,
    openTasksCount,
    alerts,
  };
}
