import Link from "next/link";
import { listMembers } from "@/lib/data/members";
import { PageHeader, Badge } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";

export default async function MembersPage() {
  const members = await listMembers();

  return (
    <div>
      <PageHeader title="Member Charts" description={`${members.length} member${members.length === 1 ? "" : "s"}`} />

      <div className="p-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Date of Birth</th>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium">CCL Level</th>
                <th className="px-4 py-3 font-medium">Assigned CC</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/members/${member.id}`}
                      className="font-medium text-slate-900 hover:text-fuchsia-600"
                    >
                      {member.firstName} {member.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(member.dateOfBirth)}</td>
                  <td className="px-4 py-3 text-slate-600">{member.program ?? "—"}</td>
                  <td className="px-4 py-3">
                    {member.cclLevel ? (
                      <Badge color={member.cclLevel === "HIGH_RISK" ? "red" : "blue"}>
                        {titleCase(member.cclLevel)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{member.assignedCoordinator?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <Badge color={member.status === "ACTIVE" ? "green" : "slate"}>{titleCase(member.status)}</Badge>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No members yet.
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
