"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge, Avatar } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";

type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  status: "ACTIVE" | "INACTIVE" | "DISCHARGED";
  cclLevel: "CCL1" | "CCL2" | "CCL3" | "HIGH_RISK" | null;
  program: string | null;
  medicaidId: string | null;
  assignedCoordinator: { name: string } | null;
};

export function MemberList({ members }: { members: MemberRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = `${m.firstName} ${m.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        m.medicaidId?.toLowerCase().includes(q) ||
        m.program?.toLowerCase().includes(q) ||
        m.assignedCoordinator?.name.toLowerCase().includes(q)
      );
    });
  }, [members, query]);

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, Medicaid ID, program, or coordinator…"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
            {filtered.map((member) => (
              <tr key={member.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/members/${member.id}`} className="group flex items-center gap-3">
                    <Avatar name={`${member.firstName} ${member.lastName}`} size="sm" />
                    <span className="font-medium text-slate-900 group-hover:text-fuchsia-600">
                      {member.firstName} {member.lastName}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(member.dateOfBirth)}</td>
                <td className="px-4 py-3 text-slate-600">{member.program ?? "—"}</td>
                <td className="px-4 py-3">
                  {member.cclLevel ? (
                    <Badge color={member.cclLevel === "HIGH_RISK" ? "red" : "blue"}>{titleCase(member.cclLevel)}</Badge>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {members.length === 0 ? "No members yet." : "No members match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
