import { requireRole, getCurrentUser } from "@/lib/dal";
import { getClinicUsers } from "@/lib/data/settings";
import { getAuditLog } from "@/lib/data/audit";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { UsersTab } from "@/components/settings/users-tab";
import { AuditLogTab } from "@/components/settings/audit-log-tab";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; user?: string }>;
}) {
  await requireRole("ADMIN");
  const { tab, user } = await searchParams;

  const [users, auditLogs, currentUser] = await Promise.all([getClinicUsers(), getAuditLog(user), getCurrentUser()]);

  return (
    <div>
      <PageHeader title="Settings" description="Manage users, roles, and the audit trail." />
      <Tabs
        defaultTabId={tab}
        tabs={[
          {
            id: "users",
            label: "Users & Roles",
            content: <UsersTab users={users} currentUserId={currentUser?.id ?? ""} />,
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
