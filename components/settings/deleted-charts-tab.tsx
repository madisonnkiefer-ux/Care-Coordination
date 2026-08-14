import { Card } from "@/components/ui";
import { restoreMember } from "@/app/actions/delete";
import { formatDateTime } from "@/lib/format";

type DeletedMember = {
  id: string;
  firstName: string;
  lastName: string;
  medicaidId: string | null;
  deletedAt: Date | null;
  deletedBy: { name: string } | null;
};

export function DeletedChartsTab({ members }: { members: DeletedMember[] }) {
  return (
    <div className="p-8">
      <Card title="Deleted Charts">
        <p className="mb-4 text-sm text-stone-500">
          Soft-deleted — hidden everywhere in the app but not erased. Restoring puts a chart right back where it was.
        </p>
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Medicaid ID</th>
                <th className="px-4 py-3 font-medium">Deleted At</th>
                <th className="px-4 py-3 font-medium">Deleted By</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 text-stone-800">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{m.medicaidId ?? "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-stone-500">{formatDateTime(m.deletedAt)}</td>
                  <td className="px-4 py-2.5 text-stone-600">{m.deletedBy?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={restoreMember.bind(null, m.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Restore
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone-400">
                    No deleted charts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
