import { getAuditLog } from "@/lib/data/audit";
import { PageHeader, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

const ACTION_COLORS: Record<string, "green" | "blue" | "yellow" | "red" | "slate"> = {
  VIEW: "slate",
  CREATE: "green",
  UPDATE: "blue",
  DELETE: "red",
  LOGIN: "green",
  LOGIN_FAILED: "red",
  LOGOUT: "slate",
};

export default async function AuditLogPage() {
  const logs = await getAuditLog();

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Record-level trail of who viewed or edited PHI, and when. Visible to supervisors and admins only."
      />

      <div className="p-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Member</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-2.5 text-slate-800">{log.user?.name ?? "Unknown"}</td>
                  <td className="px-4 py-2.5">
                    <Badge color={ACTION_COLORS[log.action] ?? "slate"}>{log.action}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{log.resource}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {log.member ? `${log.member.firstName} ${log.member.lastName}` : "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No audit events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
