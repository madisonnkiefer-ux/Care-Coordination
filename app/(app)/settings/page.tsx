import { requireRole, getCurrentUser } from "@/lib/dal";
import { getClinicUsers, getAllOffices, getDeletedMembers } from "@/lib/data/settings";
import { getAuditLog } from "@/lib/data/audit";
import { getFormFieldsForSettings } from "@/lib/data/form-fields";
import { getCustomQuestionsForSettings } from "@/lib/data/custom-questions";
import { getSecurityAlerts } from "@/lib/data/security-alerts";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { UsersTab } from "@/components/settings/users-tab";
import { AuditLogTab } from "@/components/settings/audit-log-tab";
import { OfficesTab } from "@/components/settings/offices-tab";
import { DeletedChartsTab } from "@/components/settings/deleted-charts-tab";
import { FormFieldsTab } from "@/components/settings/form-fields-tab";
import { CustomQuestionsTab } from "@/components/settings/custom-questions-tab";
import { SecurityAlertsTab } from "@/components/settings/security-alerts-tab";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; user?: string }>;
}) {
  await requireRole("ADMIN");
  const { tab, user } = await searchParams;

  const [users, auditLogs, currentUser, offices, deletedMembers, formFields, customQuestions, securityAlerts] = await Promise.all([
    getClinicUsers(),
    getAuditLog(user),
    getCurrentUser(),
    getAllOffices(),
    getDeletedMembers(),
    getFormFieldsForSettings(),
    getCustomQuestionsForSettings(),
    getSecurityAlerts(),
  ]);

  return (
    <div>
      <PageHeader title="Settings" description="Manage users, roles, offices, and the audit trail." />
      <Tabs
        key={tab ?? "users"}
        defaultTabId={tab}
        tabs={[
          {
            id: "users",
            label: "Users & Roles",
            content: <UsersTab users={users} currentUserId={currentUser?.id ?? ""} />,
          },
          {
            id: "offices",
            label: "Offices",
            content: <OfficesTab offices={offices} />,
          },
          {
            id: "deleted",
            label: "Deleted Charts",
            content: <DeletedChartsTab members={deletedMembers} />,
          },
          {
            id: "form-fields",
            label: "Form Content",
            content: <FormFieldsTab rows={formFields} />,
          },
          {
            id: "custom-questions",
            label: "Additional Questions",
            content: <CustomQuestionsTab questions={customQuestions} />,
          },
          {
            id: "audit",
            label: "Audit Log",
            content: <AuditLogTab users={users} logs={auditLogs} selectedUserId={user} />,
          },
          {
            id: "security-alerts",
            label: "Security Alerts",
            content: <SecurityAlertsTab {...securityAlerts} />,
          },
        ]}
      />
    </div>
  );
}
