import { requirePermission, getCurrentUser } from "@/lib/dal";
import { getClinicUsers, getAllOffices, getDeletedMembers } from "@/lib/data/settings";
import { getAuditLog } from "@/lib/data/audit";
import { getFormFieldsForSettings } from "@/lib/data/form-fields";
import { getCustomQuestionsForSettings } from "@/lib/data/custom-questions";
import { getSecurityAlerts } from "@/lib/data/security-alerts";
import { getVendors } from "@/lib/data/vendors";
import { getAllAmendmentRequests, getRecordExportLog } from "@/lib/data/amendment-requests";
import { getRolesAndPermissionsData } from "@/lib/data/permissions";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { UsersTab } from "@/components/settings/users-tab";
import { AuditLogTab } from "@/components/settings/audit-log-tab";
import { OfficesTab } from "@/components/settings/offices-tab";
import { DeletedChartsTab } from "@/components/settings/deleted-charts-tab";
import { FormFieldsTab } from "@/components/settings/form-fields-tab";
import { CustomQuestionsTab } from "@/components/settings/custom-questions-tab";
import { SecurityAlertsTab } from "@/components/settings/security-alerts-tab";
import { VendorsTab } from "@/components/settings/vendors-tab";
import { PatientRightsTab } from "@/components/settings/patient-rights-tab";
import { RolesTab } from "@/components/settings/roles-tab";
import type { Permission } from "@/app/generated/prisma/client";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; user?: string }>;
}) {
  const session = await requirePermission("VIEW_SETTINGS");
  const { tab, user } = await searchParams;
  const has = (permission: Permission) => session.permissions.includes(permission);

  const currentUser = await getCurrentUser();

  // Every tab is independently gated by its own permission (see
  // lib/permissions.ts) — a role can be granted VIEW_SETTINGS without every
  // sub-permission, so only fetch and render what the caller can actually
  // use. Unlike before this system existed (ADMIN-only, so every tab was
  // always visible), the tab list itself is now a function of the caller's
  // permissions.
  const tabs: { id: string; label: string; content: React.ReactNode }[] = [];

  if (has("MANAGE_USERS")) {
    // Editing what a role can do (the Roles & Permissions tab) is
    // permanently tied to the real ADMIN role, never delegable through the
    // permission system itself — see lib/data/permissions.ts's comment.
    // Fetch it only for actual admins so a Supervisor granted MANAGE_USERS
    // doesn't see a tab where every save would silently fail.
    const isAdmin = session.role === "ADMIN";
    const [users, roles] = await Promise.all([getClinicUsers(), isAdmin ? getRolesAndPermissionsData() : null]);
    tabs.push({
      id: "users",
      label: "Users & Roles",
      content: <UsersTab users={users} currentUserId={currentUser?.id ?? ""} customRoles={roles?.customRoles ?? []} />,
    });
    if (roles) {
      tabs.push({
        id: "roles",
        label: "Roles & Permissions",
        content: <RolesTab builtInRoles={roles.builtInRoles} customRoles={roles.customRoles} />,
      });
    }
    if (has("VIEW_AUDIT_LOG")) {
      const auditLogs = await getAuditLog(user);
      tabs.push({ id: "audit", label: "Audit Log", content: <AuditLogTab users={users} logs={auditLogs} selectedUserId={user} /> });
    }
  } else if (has("VIEW_AUDIT_LOG")) {
    const auditLogs = await getAuditLog(user);
    tabs.push({ id: "audit", label: "Audit Log", content: <AuditLogTab users={[]} logs={auditLogs} selectedUserId={user} /> });
  }

  if (has("MANAGE_OFFICES")) {
    const offices = await getAllOffices();
    tabs.push({ id: "offices", label: "Offices", content: <OfficesTab offices={offices} /> });
  }

  if (has("DELETE_RECORDS")) {
    const deletedMembers = await getDeletedMembers();
    tabs.push({ id: "deleted", label: "Deleted Charts", content: <DeletedChartsTab members={deletedMembers} /> });
  }

  if (has("MANAGE_FORM_CONTENT")) {
    const [formFields, customQuestions] = await Promise.all([getFormFieldsForSettings(), getCustomQuestionsForSettings()]);
    tabs.push({ id: "form-fields", label: "Form Content", content: <FormFieldsTab rows={formFields} /> });
    tabs.push({ id: "custom-questions", label: "Additional Questions", content: <CustomQuestionsTab questions={customQuestions} /> });
  }

  if (has("VIEW_SECURITY_ALERTS")) {
    const securityAlerts = await getSecurityAlerts();
    tabs.push({ id: "security-alerts", label: "Security Alerts", content: <SecurityAlertsTab {...securityAlerts} /> });
  }

  if (has("MANAGE_VENDORS")) {
    const vendors = await getVendors();
    tabs.push({ id: "vendors", label: "Vendors & BAAs", content: <VendorsTab vendors={vendors} /> });
  }

  if (has("RESOLVE_AMENDMENT_REQUESTS")) {
    const [amendmentRequests, recordExportLog] = await Promise.all([getAllAmendmentRequests(), getRecordExportLog()]);
    tabs.push({
      id: "patient-rights",
      label: "Patient Rights",
      content: <PatientRightsTab requests={amendmentRequests} exportLog={recordExportLog} />,
    });
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage users, roles, offices, and the audit trail." />
      {tabs.length > 0 ? (
        <Tabs key={tab ?? tabs[0].id} defaultTabId={tab} tabs={tabs} />
      ) : (
        <p className="p-8 text-sm text-stone-400">Nothing to show — ask an admin to grant you access to a Settings section.</p>
      )}
    </div>
  );
}
