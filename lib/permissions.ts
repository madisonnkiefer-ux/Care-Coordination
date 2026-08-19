// Admin-configurable role permissions — the "what can each role see/do"
// system. Deliberately covers only the ~20 gates that are genuinely
// visibility/management preferences (which pages a role can open, which
// admin actions it can take). NOT covered here, and never overridable by
// this system:
//   - Chart-signing authority (app/actions/intake.ts, app/actions/toc.ts —
//     hardcoded to ADMIN). Signing a legal chart is a compliance
//     attestation, not a page a role can be shown or hidden.
//   - The care-coordinator-requests / supervisor-approves status-change
//     workflow (app/actions/member-status.ts's `requiresApproval`). This is
//     the approval workflow itself, not a feature toggle.
//   - Caseload data-scoping (own patients vs. clinic-wide) on the Home,
//     Tasks, and Home Visiting pages — this is data isolation, the same
//     category of thing as clinic-level tenant isolation, not a visibility
//     preference.
//   - Care-coordinator self-assignment prevention on new patients.
// Those all stay hardwired to the `Role` enum in code, same as before this
// system existed.
//
// No "server-only" guard here (unlike lib/data/permissions.ts) — this file
// is pure constant data (labels, groupings, defaults), safe to bundle into
// client components that render the permission-editing UI.
import type { Permission, Role } from "@/app/generated/prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  CARE_COORDINATOR: "Care Coordinator",
  SUPERVISOR: "Supervisor",
  ADMIN: "Admin",
};

export const ALL_PERMISSIONS: Permission[] = [
  "VIEW_SUPERVISOR_DASHBOARD",
  "VIEW_REPORTS",
  "EXPORT_REPORTS",
  "VIEW_BILLING",
  "EXPORT_BILLING",
  "EXPORT_MEMBER_RECORD",
  "MANAGE_USERS",
  "MANAGE_OFFICES",
  "MANAGE_VENDORS",
  "MANAGE_FORM_CONTENT",
  "MANAGE_RESOURCES",
  "RESET_USER_MFA",
  "VIEW_AUDIT_LOG",
  "VIEW_SECURITY_ALERTS",
  "DELETE_RECORDS",
  "ASSIGN_MEMBERS",
  "APPROVE_STATUS_CHANGES",
  "RESOLVE_AMENDMENT_REQUESTS",
  "ASSIGN_WORK_TO_OTHERS",
  "VIEW_SETTINGS",
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  VIEW_SUPERVISOR_DASHBOARD: "View Supervisor Dashboard",
  VIEW_REPORTS: "View Reports",
  EXPORT_REPORTS: "Export Reports (Monthly Activity)",
  VIEW_BILLING: "View & Manage Billing",
  EXPORT_BILLING: "Export Billing Roster",
  EXPORT_MEMBER_RECORD: "Export Full Patient Record (Right to Access)",
  MANAGE_USERS: "Manage Users (create, roles, passwords, lock/unlock)",
  MANAGE_OFFICES: "Manage Offices",
  MANAGE_VENDORS: "Manage Vendors / BAA Tracker",
  MANAGE_FORM_CONTENT: "Manage Form Content (custom questions, field ordering)",
  MANAGE_RESOURCES: "Add, Edit & Delete Resource Directory Entries",
  RESET_USER_MFA: "Reset a User's Two-Factor Authentication",
  VIEW_AUDIT_LOG: "View Audit Log",
  VIEW_SECURITY_ALERTS: "View Security Alerts",
  DELETE_RECORDS: "Delete & Restore Records",
  ASSIGN_MEMBERS: "Reassign Members to a Coordinator",
  APPROVE_STATUS_CHANGES: "Approve/Reject Status Changes",
  RESOLVE_AMENDMENT_REQUESTS: "View & Resolve Amendment Requests",
  ASSIGN_WORK_TO_OTHERS: "Assign Tasks & Home Visits to Other Coordinators",
  VIEW_SETTINGS: "Access the Settings Page",
};

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Pages",
    permissions: ["VIEW_SUPERVISOR_DASHBOARD", "VIEW_REPORTS", "VIEW_BILLING", "VIEW_SETTINGS"],
  },
  {
    label: "Exports & Disclosures",
    permissions: ["EXPORT_REPORTS", "EXPORT_BILLING", "EXPORT_MEMBER_RECORD"],
  },
  {
    label: "Care Coordination",
    permissions: ["ASSIGN_MEMBERS", "APPROVE_STATUS_CHANGES", "RESOLVE_AMENDMENT_REQUESTS", "ASSIGN_WORK_TO_OTHERS", "DELETE_RECORDS"],
  },
  {
    label: "Administration",
    permissions: ["MANAGE_USERS", "MANAGE_OFFICES", "MANAGE_VENDORS", "MANAGE_FORM_CONTENT", "MANAGE_RESOURCES", "RESET_USER_MFA"],
  },
  {
    label: "Audit & Security",
    permissions: ["VIEW_AUDIT_LOG", "VIEW_SECURITY_ALERTS"],
  },
];

// The app's original hardcoded behavior, preserved exactly as the default
// for each built-in role — a clinic that never touches this feature
// behaves identically to before it existed. Editing a role's permissions
// (or creating a custom role) only ever adds/removes from this baseline
// going forward; it never happens implicitly.
export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  CARE_COORDINATOR: [],
  SUPERVISOR: [
    "VIEW_SUPERVISOR_DASHBOARD",
    "VIEW_REPORTS",
    "EXPORT_REPORTS",
    "VIEW_BILLING",
    "EXPORT_BILLING",
    "EXPORT_MEMBER_RECORD",
    "MANAGE_RESOURCES",
    "ASSIGN_MEMBERS",
    "APPROVE_STATUS_CHANGES",
    "RESOLVE_AMENDMENT_REQUESTS",
    "ASSIGN_WORK_TO_OTHERS",
  ],
  ADMIN: ALL_PERMISSIONS,
};
