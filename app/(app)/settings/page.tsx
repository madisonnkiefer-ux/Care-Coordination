import { requireRole, getCurrentUser } from "@/lib/dal";
import { getClinicUsers, getAllOffices, getDeletedMembers } from "@/lib/data/settings";
import { getAuditLog } from "@/lib/data/audit";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { UsersTab } from "@/components/settings/users-tab";
import { AuditLogTab } from "@/components/settings/audit-log-tab";
import { OfficesTab } from "@/components/settings/offices-tab";
import { DeletedChartsTab } from "@/components/settings/deleted-charts-tab";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; user?: string }>;
}) {
  await requireRole("ADMIN");
  const { tab, user } = await searchParams;

  const [users, auditLogs, currentUser, offices, deletedMembers] = await Promise.all([
    getClinicUsers(),
    getAuditLog(user),
    getCurrentUser(),
    getAllOffices(),
    getDeletedMembers(),
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
            id: "audit",
            label: "Audit Log",
            content: <AuditLogTab users={users} logs={auditLogs} selectedUserId={user} />,
          },
        ]}
      />
    </div>
  );
}
