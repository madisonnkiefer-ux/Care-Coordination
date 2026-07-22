"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Check, X } from "lucide-react";
import { Badge, Avatar } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { statusBadgeColor } from "@/lib/member-status";
import type { MemberStatus } from "@/app/generated/prisma/client";

type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  status: MemberStatus;
  cclLevel: "CCL1" | "CCL2" | "CCL3" | "HIGH_RISK" | null;
  program: string | null;
  medicaidId: string | null;
  chartId: string | null;
  subscriberId: string | null;
  availityId: string | null;
  medicaidEligibilityVerified: boolean | null;
  medicaidEligibilityRenewalDate: Date | null;
  dueDate: Date | null;
  provider: string | null;
  assignedCoordinator: { name: string } | null;
  lastContactDate: Date | null;
  lastInPersonTouchpointDate: Date | null;
  initialCnaDate: Date | null;
  mostRecentCnaDate: Date | null;
  mostRecentCnaType: string | null;
  initialCcpStartDate: Date | null;
  lastCcpUpdatedAt: Date | null;
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
        m.chartId?.toLowerCase().includes(q) ||
        m.subscriberId?.toLowerCase().includes(q) ||
        m.availityId?.toLowerCase().includes(q) ||
        m.provider?.toLowerCase().includes(q) ||
        m.program?.toLowerCase().includes(q) ||
        m.assignedCoordinator?.name.toLowerCase().includes(q)
      );
    });
  }, [members, query]);

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, IDs, provider, program…"
          className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-100 bg-white shadow-sm">
        <table className="w-full min-w-[2200px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="sticky left-0 z-10 bg-stone-50 px-4 py-3 font-medium">Patient Name</th>
              <th className="px-4 py-3 font-medium">Chart ID</th>
              <th className="px-4 py-3 font-medium">Type of Patient</th>
              <th className="px-4 py-3 font-medium">Last Contact</th>
              <th className="px-4 py-3 font-medium">Medicaid ID</th>
              <th className="px-4 py-3 font-medium">Subscriber ID</th>
              <th className="px-4 py-3 font-medium">Availity ID</th>
              <th className="px-4 py-3 font-medium">Medicaid Elig. Verified</th>
              <th className="px-4 py-3 font-medium">Medicaid Renewal</th>
              <th className="px-4 py-3 font-medium">Due Date</th>
              <th className="px-4 py-3 font-medium">CCL</th>
              <th className="px-4 py-3 font-medium">Initial CNA Date</th>
              <th className="px-4 py-3 font-medium">Initial CCP Start Date</th>
              <th className="px-4 py-3 font-medium">Most Recent CNA Date</th>
              <th className="px-4 py-3 font-medium">Type (Initial/Annual)</th>
              <th className="px-4 py-3 font-medium">CCP Last Updated</th>
              <th className="px-4 py-3 font-medium">Last In-Person Touchpoint</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Assigned CC</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((member) => (
              <tr key={member.id} className="transition-colors hover:bg-stone-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 group-hover:bg-stone-50">
                  <Link href={`/members/${member.id}`} className="group flex items-center gap-3">
                    <Avatar name={`${member.firstName} ${member.lastName}`} size="sm" />
                    <span className="whitespace-nowrap font-medium text-stone-900 group-hover:text-fuchsia-600">
                      {member.firstName} {member.lastName}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-600">{member.chartId ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600">{member.program ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600">{formatDate(member.lastContactDate)}</td>
                <td className="px-4 py-3 text-stone-600">{member.medicaidId ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600">{member.subscriberId ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600">{member.availityId ?? "—"}</td>
                <td className="px-4 py-3">
                  {member.medicaidEligibilityVerified ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <X className="h-4 w-4 text-stone-300" />
                  )}
                </td>
                <td className="px-4 py-3 text-stone-600">{formatDate(member.medicaidEligibilityRenewalDate)}</td>
                <td className="px-4 py-3 text-stone-600">{formatDate(member.dueDate)}</td>
                <td className="px-4 py-3">
                  {member.cclLevel ? (
                    <Badge color={member.cclLevel === "HIGH_RISK" ? "red" : "blue"}>{titleCase(member.cclLevel)}</Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-stone-600">{formatDate(member.initialCnaDate)}</td>
                <td className="px-4 py-3 text-stone-600">{formatDate(member.initialCcpStartDate)}</td>
                <td className="px-4 py-3 text-stone-600">{formatDate(member.mostRecentCnaDate)}</td>
                <td className="px-4 py-3 text-stone-600">{member.mostRecentCnaType ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600">{formatDate(member.lastCcpUpdatedAt)}</td>
                <td className="px-4 py-3 text-stone-600">{formatDate(member.lastInPersonTouchpointDate)}</td>
                <td className="px-4 py-3 text-stone-600">{member.provider ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600">{member.assignedCoordinator?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3">
                  <Badge color={statusBadgeColor(member.status)}>{titleCase(member.status)}</Badge>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={19} className="px-4 py-10 text-center text-stone-400">
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
