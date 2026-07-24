"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Check, X, Download } from "lucide-react";
import { Badge, Avatar } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { statusBadgeColor } from "@/lib/member-status";
import type { MemberStatus } from "@/app/generated/prisma/client";

const CSV_HEADERS = [
  "Patient Name",
  "Chart ID",
  "Type of Patient",
  "Last Contact",
  "Medicaid ID",
  "Subscriber ID",
  "Availity ID",
  "Medicaid Elig. Verified",
  "Medicaid Renewal",
  "Due Date",
  "CCL",
  "Initial CNA Date",
  "Initial CCP Start Date",
  "Most Recent CNA Date",
  "Type (Initial/Annual)",
  "CCP Last Updated",
  "Last In-Person Touchpoint",
  "Provider",
  "Assigned CC",
  "Status",
];

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function downloadCsv(rows: MemberRow[], filenamePrefix: string) {
  const lines = rows.map((m) =>
    [
      `${m.firstName} ${m.lastName}`,
      m.chartId ?? "",
      m.program ?? "",
      formatDate(m.lastContactDate),
      m.medicaidId ?? "",
      m.subscriberId ?? "",
      m.availityId ?? "",
      m.medicaidEligibilityVerified ? "Yes" : "No",
      formatDate(m.medicaidEligibilityRenewalDate),
      formatDate(m.dueDate),
      m.cclLevel ? titleCase(m.cclLevel) : "",
      formatDate(m.initialCnaDate),
      formatDate(m.initialCcpStartDate),
      formatDate(m.mostRecentCnaDate),
      m.mostRecentCnaType ?? "",
      formatDate(m.lastCcpUpdatedAt),
      formatDate(m.lastInPersonTouchpointDate),
      m.provider ?? "",
      m.assignedCoordinator?.name ?? "Unassigned",
      titleCase(m.status),
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [CSV_HEADERS.join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

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
  assignedCoordinatorId: string | null;
  assignedCoordinator: { name: string } | null;
  lastContactDate: Date | null;
  lastInPersonTouchpointDate: Date | null;
  initialCnaDate: Date | null;
  mostRecentCnaDate: Date | null;
  mostRecentCnaType: string | null;
  initialCcpStartDate: Date | null;
  lastCcpUpdatedAt: Date | null;
};

export function MemberList({ members, currentUserId }: { members: MemberRow[]; currentUserId: string | null }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "mine">("mine");

  const myMembers = useMemo(
    () => members.filter((m) => m.assignedCoordinatorId === currentUserId),
    [members, currentUserId]
  );

  const scoped = scope === "mine" ? myMembers : members;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter((m) => {
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
  }, [scoped, query]);

  return (
    <div>
      {currentUserId && (
        <div className="mb-4 flex gap-1 rounded-lg border border-stone-200 bg-stone-100 p-1 text-sm font-medium w-fit">
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              scope === "all" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            All Members ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setScope("mine")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              scope === "mine" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            My Members ({myMembers.length})
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, IDs, provider, program…"
            className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(filtered, scope === "mine" ? "my-members" : "all-members")}
          disabled={filtered.length === 0}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
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
                  {scoped.length === 0
                    ? scope === "mine"
                      ? "No members assigned to you."
                      : "No members yet."
                    : "No members match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
