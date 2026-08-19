import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

const ACTION_COLORS: Record<string, "green" | "blue" | "yellow" | "red" | "slate" | "fuchsia"> = {
  VIEW: "slate",
  CREATE: "green",
  UPDATE: "blue",
  DELETE: "red",
  LOGIN: "green",
  LOGIN_FAILED: "red",
  LOGOUT: "slate",
  EXPORT: "fuchsia",
  PRINT: "yellow",
};

type AuditUser = { id: string; name: string; email: string };

type AuditLogEntry = {
  id: string;
  createdAt: Date;
  action: string;
  resource: string;
  user: { name: string; email: string } | null;
  member: { firstName: string; lastName: string } | null;
};

export function AuditLogTab({
  users,
  logs,
  selectedUserId,
}: {
  users: AuditUser[];
  logs: AuditLogEntry[];
  selectedUserId?: string;
}) {
  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="p-8">
      <form method="get" className="mb-4 flex items-end gap-2">
        <input type="hidden" name="tab" value="audit" />
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">User</label>
          <select
            name="user"
            defaultValue={selectedUserId ?? ""}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              {!selectedUser && <th className="px-4 py-3 font-medium">User</th>}
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Resource</th>
              <th className="px-4 py-3 font-medium">Member</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2.5 whitespace-nowrap text-stone-500">{formatDateTime(log.createdAt)}</td>
                {!selectedUser && <td className="px-4 py-2.5 text-stone-800">{log.user?.name ?? "Unknown"}</td>}
                <td className="px-4 py-2.5">
                  <Badge color={ACTION_COLORS[log.action] ?? "slate"}>{log.action}</Badge>
                </td>
                <td className="px-4 py-2.5 text-stone-600">{log.resource}</td>
                <td className="px-4 py-2.5 text-stone-600">
                  {log.member ? `${log.member.firstName} ${log.member.lastName}` : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={selectedUser ? 4 : 5} className="px-4 py-10 text-center text-stone-400">
                  No audit events{selectedUser ? ` for ${selectedUser.name}` : ""} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
