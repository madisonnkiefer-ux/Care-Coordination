// Graduation review tracking, shared by the member chart alert, the patient
// snapshot panel, and the Supervisor Dashboard's Upcoming Graduations list.
//
// A delivery date (documented on the CCP's HEDIS Measures tab) never
// automatically changes a member's status — it only surfaces a review alert
// once the member is approaching one year post-delivery. All Graduated and
// Termed transitions still go through the normal MemberStatusChange
// approval flow (see lib/member-status.ts, app/actions/member-status.ts).
import { isTerminalStatus } from "@/lib/member-status";
import type { MemberStatus } from "@/app/generated/prisma/client";

// The alert starts appearing this many days before the expected graduation
// review date. The Supervisor Dashboard offers narrower 30/60/90 views on
// top of this widest window.
export const GRADUATION_ALERT_WINDOW_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export function expectedGraduationReviewDate(deliveryDate: Date): Date {
  return new Date(deliveryDate.getFullYear() + 1, deliveryDate.getMonth(), deliveryDate.getDate());
}

// Positive = days remaining until the review date; negative = days overdue.
export function daysUntilGraduationReview(deliveryDate: Date, now: Date = new Date()): number {
  const reviewDate = expectedGraduationReviewDate(deliveryDate);
  return Math.ceil((reviewDate.getTime() - now.getTime()) / DAY_MS);
}

export type GraduationReviewStatus = "NOT_DUE" | "UPCOMING" | "OVERDUE" | "REVIEWED";

export const GRADUATION_REVIEW_STATUS_LABEL: Record<GraduationReviewStatus, string> = {
  NOT_DUE: "Not Due",
  UPCOMING: "Upcoming",
  OVERDUE: "Overdue",
  REVIEWED: "Reviewed",
};

// null means the member has no delivery date on file — graduation tracking
// doesn't apply to them.
export function graduationReviewStatus(params: {
  deliveryDate: Date | null;
  status: MemberStatus;
  now?: Date;
}): GraduationReviewStatus | null {
  if (!params.deliveryDate) return null;

  // Once the member has moved to a terminal status (Graduated, Termed, or
  // otherwise closed out), the review has already happened by definition —
  // a supervisor made the call through the normal status-change approval.
  if (isTerminalStatus(params.status)) return "REVIEWED";

  const days = daysUntilGraduationReview(params.deliveryDate, params.now ?? new Date());
  if (days > GRADUATION_ALERT_WINDOW_DAYS) return "NOT_DUE";
  if (days < 0) return "OVERDUE";
  return "UPCOMING";
}
