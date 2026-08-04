import type { MemberStatus } from "@/app/generated/prisma/client";

// Statuses that end (or seriously interrupt) a member's active relationship
// with the clinic. When a care coordinator requests one of these, the
// change requires supervisor approval before it takes effect — see
// changeMemberStatus in app/actions/member-status.ts.
export const TERMINAL_STATUSES: MemberStatus[] = ["DECLINED", "TERMED", "GRADUATED", "TRANSFERRED", "DECEASED", "CLOSED"];

export function isTerminalStatus(status: MemberStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export const ALL_STATUSES: MemberStatus[] = [
  "PENDING_ENROLLMENT",
  "ENROLLED",
  "PENDING_ATTRIBUTION",
  "ACTIVE",
  "OUTREACH_IN_PROGRESS",
  "UNABLE_TO_REACH",
  "TEMPORARILY_INACTIVE",
  "DECLINED",
  "TERMED",
  "GRADUATED",
  "TRANSFERRED",
  "DECEASED",
  "CLOSED",
];

export type StatusBadgeColor = "green" | "yellow" | "slate" | "red";

const STATUS_BADGE_COLOR: Record<MemberStatus, StatusBadgeColor> = {
  PENDING_ENROLLMENT: "yellow",
  ENROLLED: "green",
  PENDING_ATTRIBUTION: "yellow",
  ACTIVE: "green",
  OUTREACH_IN_PROGRESS: "yellow",
  UNABLE_TO_REACH: "yellow",
  TEMPORARILY_INACTIVE: "yellow",
  DECLINED: "red",
  TERMED: "red",
  GRADUATED: "slate",
  TRANSFERRED: "slate",
  DECEASED: "red",
  CLOSED: "slate",
};

export function statusBadgeColor(status: MemberStatus): StatusBadgeColor {
  return STATUS_BADGE_COLOR[status];
}

export const CLOSURE_CHECKLIST_FIELDS = [
  { key: "finalContactDocumented", label: "Final contact attempt documented" },
  { key: "openTasksReviewed", label: "Open tasks reviewed" },
  { key: "openReferralsResolved", label: "Open referrals resolved or transferred" },
  { key: "carePlanGoalsClosed", label: "Care plan goals closed" },
  { key: "requiredNotificationsSent", label: "Required notifications sent" },
  { key: "documentsCompleted", label: "Documents completed" },
] as const;
