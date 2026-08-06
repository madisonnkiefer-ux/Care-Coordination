"use client";

import { useMemo, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { statusBadgeColor, ALL_STATUSES } from "@/lib/member-status";
import type { getReportsData } from "@/lib/data/reports";

type ReportsData = Awaited<ReturnType<typeof getReportsData>>;
type ReportMember = ReportsData["members"][number];

type ReportId = "roster" | "caseload" | "outreach" | "cna" | "ccp" | "monthly-activity";

const REPORTS: { id: ReportId; label: string }[] = [
  { id: "roster", label: "Active Roster" },
  { id: "caseload", label: "Caseload Distribution" },
  { id: "outreach", label: "Outreach Completion" },
  { id: "cna", label: "Annual CNA Status" },
  { id: "ccp", label: "CCP Completion" },
  { id: "monthly-activity", label: "Monthly Activity" },
];

function currentQuarterStart() {
  const now = new Date();
  const startMonth = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), startMonth, 1);
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient({ members, coordinators, programs }: ReportsData) {
  const [active, setActive] = useState<ReportId>("roster");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState(() => toInputDate(currentQuarterStart()));
  const [dateTo, setDateTo] = useState(() => toInputDate(new Date()));

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (coordinatorId && m.coordinatorId !== coordinatorId) return false;
      if (program && m.program !== program) return false;
      if (status && m.status !== status) return false;
      return true;
    });
  }, [members, coordinatorId, program, status]);

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setActive(r.id)}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active === r.id ? "border-charcoal text-charcoal" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {active !== "monthly-activity" && (
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <FilterField label="Coordinator">
          <select value={coordinatorId} onChange={(e) => setCoordinatorId(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose">
            <option value="">All coordinators</option>
            {coordinators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Program">
          <select value={program} onChange={(e) => setProgram(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose">
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FilterField>

        {active === "roster" && (
          <FilterField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose">
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </FilterField>
        )}

        {active === "outreach" && (
          <>
            <FilterField label="From">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose" />
            </FilterField>
            <FilterField label="To">
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose" />
            </FilterField>
          </>
        )}
      </div>
      )}

      {active === "roster" && <ActiveRosterReport members={filtered} />}
      {active === "caseload" && <CaseloadDistributionReport members={filtered} />}
      {active === "outreach" && <OutreachCompletionReport members={filtered} dateFrom={dateFrom} dateTo={dateTo} />}
      {active === "cna" && <AnnualCnaStatusReport members={filtered} />}
      {active === "ccp" && <CcpCompletionReport members={filtered} />}
      {active === "monthly-activity" && <MonthlyActivityReport />}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">{label}</label>
      {children}
    </div>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
    >
      Export CSV
    </button>
  );
}

function ReportShell({
  title,
  count,
  unit = "member",
  emptyMessage = "No members match these filters.",
  onExport,
  children,
}: {
  title: string;
  count: number;
  unit?: string;
  emptyMessage?: string;
  onExport: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {title} · <span className="font-medium text-stone-700">{count}</span> {unit}
          {count === 1 ? "" : "s"}
        </p>
        <ExportButton onClick={onExport} />
      </div>
      {count === 0 ? <p className="py-8 text-center text-sm text-stone-400">{emptyMessage}</p> : children}
    </Card>
  );
}

function coordinatorOrUnassigned(m: ReportMember) {
  return m.coordinatorName ?? "Unassigned";
}

function ActiveRosterReport({ members }: { members: ReportMember[] }) {
  return (
    <ReportShell
      title="Active Roster"
      count={members.length}
      onExport={() =>
        downloadCsv(
          "active-roster.csv",
          ["Name", "Chart ID", "Medicaid ID", "Program", "Status", "CCL Level", "Coordinator"],
          members.map((m) => [
            `${m.firstName} ${m.lastName}`,
            m.chartId ?? "",
            m.medicaidId ?? "",
            m.program ?? "",
            titleCase(m.status),
            m.cclLevel ? titleCase(m.cclLevel) : "",
            coordinatorOrUnassigned(m),
          ])
        )
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-400">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Chart ID</th>
            <th className="pb-2 font-medium">Medicaid ID</th>
            <th className="pb-2 font-medium">Program</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">CCL</th>
            <th className="pb-2 font-medium">Coordinator</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {members.map((m) => (
            <tr key={m.id}>
              <td className="py-2 font-medium text-stone-800">{m.firstName} {m.lastName}</td>
              <td className="py-2 text-stone-600">{m.chartId ?? "—"}</td>
              <td className="py-2 text-stone-600">{m.medicaidId ?? "—"}</td>
              <td className="py-2 text-stone-600">{m.program ?? "—"}</td>
              <td className="py-2">
                <Badge color={statusBadgeColor(m.status)}>{titleCase(m.status)}</Badge>
              </td>
              <td className="py-2 text-stone-600">{m.cclLevel ? titleCase(m.cclLevel) : "—"}</td>
              <td className="py-2 text-stone-600">{coordinatorOrUnassigned(m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}

function CaseloadDistributionReport({ members }: { members: ReportMember[] }) {
  const rows = useMemo(() => {
    const byCoordinator = new Map<string, { name: string; total: number; active: number; programs: Map<string, number> }>();
    for (const m of members) {
      const key = m.coordinatorId ?? "unassigned";
      const name = coordinatorOrUnassigned(m);
      if (!byCoordinator.has(key)) byCoordinator.set(key, { name, total: 0, active: 0, programs: new Map() });
      const entry = byCoordinator.get(key)!;
      entry.total += 1;
      if (m.status === "ACTIVE") entry.active += 1;
      if (m.program) entry.programs.set(m.program, (entry.programs.get(m.program) ?? 0) + 1);
    }
    return Array.from(byCoordinator.values()).sort((a, b) => b.total - a.total);
  }, [members]);

  return (
    <ReportShell
      title="Caseload Distribution"
      count={rows.length}
      unit="coordinator"
      emptyMessage="No coordinators match these filters."
      onExport={() =>
        downloadCsv(
          "caseload-distribution.csv",
          ["Coordinator", "Total", "Active", "Program Breakdown"],
          rows.map((r) => [
            r.name,
            r.total,
            r.active,
            Array.from(r.programs.entries()).map(([p, n]) => `${p}: ${n}`).join("; "),
          ])
        )
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-400">
            <th className="pb-2 font-medium">Coordinator</th>
            <th className="pb-2 font-medium">Total</th>
            <th className="pb-2 font-medium">Active</th>
            <th className="pb-2 font-medium">Program Breakdown</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="py-2 font-medium text-stone-800">{r.name}</td>
              <td className="py-2 text-stone-600">{r.total}</td>
              <td className="py-2 text-stone-600">{r.active}</td>
              <td className="py-2 text-stone-600">
                {Array.from(r.programs.entries())
                  .map(([p, n]) => `${p}: ${n}`)
                  .join(", ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}

function OutreachCompletionReport({ members, dateFrom, dateTo }: { members: ReportMember[]; dateFrom: string; dateTo: string }) {
  const rows = useMemo(() => {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    return members.map((m) => {
      const inRange = m.contacts.filter((c) => c.createdAt >= from && c.createdAt <= to);
      const successfulInRange = inRange.filter((c) => c.successful).length;
      const lastSuccessful = m.contacts
        .filter((c) => c.successful)
        .reduce<Date | null>((latest, c) => (!latest || c.createdAt > latest ? c.createdAt : latest), null);

      return {
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        coordinator: coordinatorOrUnassigned(m),
        attempts: inRange.length,
        successful: successfulInRange,
        lastSuccessful,
        contactedInRange: successfulInRange > 0,
      };
    });
  }, [members, dateFrom, dateTo]);

  const contactedCount = rows.filter((r) => r.contactedInRange).length;

  return (
    <ReportShell
      title={`Outreach Completion (${contactedCount}/${rows.length} contacted in range)`}
      count={rows.length}
      onExport={() =>
        downloadCsv(
          "outreach-completion.csv",
          ["Name", "Coordinator", "Attempts in Range", "Successful in Range", "Last Successful Contact", "Contacted in Range"],
          rows.map((r) => [
            r.name,
            r.coordinator,
            r.attempts,
            r.successful,
            r.lastSuccessful ? formatDate(r.lastSuccessful) : "Never",
            r.contactedInRange ? "Yes" : "No",
          ])
        )
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-400">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Coordinator</th>
            <th className="pb-2 font-medium">Attempts</th>
            <th className="pb-2 font-medium">Successful</th>
            <th className="pb-2 font-medium">Last Successful Contact</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2 font-medium text-stone-800">{r.name}</td>
              <td className="py-2 text-stone-600">{r.coordinator}</td>
              <td className="py-2 text-stone-600">{r.attempts}</td>
              <td className="py-2 text-stone-600">{r.successful}</td>
              <td className="py-2 text-stone-600">{r.lastSuccessful ? formatDate(r.lastSuccessful) : "Never"}</td>
              <td className="py-2">
                <Badge color={r.contactedInRange ? "green" : "red"}>{r.contactedInRange ? "Contacted" : "Not Contacted"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}

function AnnualCnaStatusReport({ members }: { members: ReportMember[] }) {
  const rows = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return members.map((m) => {
      const dueDate = m.lastCnaDate
        ? new Date(m.lastCnaDate.getFullYear() + 1, m.lastCnaDate.getMonth(), m.lastCnaDate.getDate())
        : null;
      let category: "Never Completed" | "Overdue" | "Due Soon" | "Current";
      if (!dueDate) category = "Never Completed";
      else if (dueDate < now) category = "Overdue";
      else if (dueDate <= in30Days) category = "Due Soon";
      else category = "Current";

      return {
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        coordinator: coordinatorOrUnassigned(m),
        lastCnaDate: m.lastCnaDate,
        lastCnaType: m.lastCnaType,
        dueDate,
        category,
      };
    });
  }, [members]);

  const badgeColor = (c: string) => (c === "Overdue" || c === "Never Completed" ? "red" : c === "Due Soon" ? "yellow" : "green");

  return (
    <ReportShell
      title="Annual CNA Status"
      count={rows.length}
      onExport={() =>
        downloadCsv(
          "annual-cna-status.csv",
          ["Name", "Coordinator", "Last CNA Date", "Type", "Due Date", "Status"],
          rows.map((r) => [
            r.name,
            r.coordinator,
            r.lastCnaDate ? formatDate(r.lastCnaDate) : "",
            r.lastCnaType ?? "",
            r.dueDate ? formatDate(r.dueDate) : "",
            r.category,
          ])
        )
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-400">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Coordinator</th>
            <th className="pb-2 font-medium">Last CNA Date</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Due Date</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2 font-medium text-stone-800">{r.name}</td>
              <td className="py-2 text-stone-600">{r.coordinator}</td>
              <td className="py-2 text-stone-600">{r.lastCnaDate ? formatDate(r.lastCnaDate) : "—"}</td>
              <td className="py-2 text-stone-600">{r.lastCnaType ?? "—"}</td>
              <td className="py-2 text-stone-600">{r.dueDate ? formatDate(r.dueDate) : "—"}</td>
              <td className="py-2">
                <Badge color={badgeColor(r.category)}>{r.category}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}

function CcpCompletionReport({ members }: { members: ReportMember[] }) {
  const inPlaceCount = members.filter((m) => m.hasCarePlan).length;

  return (
    <ReportShell
      title={`CCP Completion (${inPlaceCount}/${members.length} in place)`}
      count={members.length}
      onExport={() =>
        downloadCsv(
          "ccp-completion.csv",
          ["Name", "Coordinator", "Care Plan Status", "CCP Start Date", "Last Updated"],
          members.map((m) => [
            `${m.firstName} ${m.lastName}`,
            coordinatorOrUnassigned(m),
            m.hasCarePlan ? "In Place" : "Missing",
            m.ccpStartDate ? formatDate(m.ccpStartDate) : "",
            m.ccpLastUpdated ? formatDate(m.ccpLastUpdated) : "",
          ])
        )
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-400">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Coordinator</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">CCP Start Date</th>
            <th className="pb-2 font-medium">Last Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {members.map((m) => (
            <tr key={m.id}>
              <td className="py-2 font-medium text-stone-800">{m.firstName} {m.lastName}</td>
              <td className="py-2 text-stone-600">{coordinatorOrUnassigned(m)}</td>
              <td className="py-2">
                <Badge color={m.hasCarePlan ? "green" : "red"}>{m.hasCarePlan ? "In Place" : "Missing"}</Badge>
              </td>
              <td className="py-2 text-stone-600">{m.ccpStartDate ? formatDate(m.ccpStartDate) : "—"}</td>
              <td className="py-2 text-stone-600">{m.ccpLastUpdated ? formatDate(m.ccpLastUpdated) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportShell>
  );
}

function MonthlyActivityReport() {
  const [startDate, setStartDate] = useState(() => toInputDate(currentQuarterStart()));
  const [endDate, setEndDate] = useState(() => toInputDate(new Date()));

  return (
    <Card title="Monthly Activity Report">
      <p className="mb-4 text-sm text-stone-500">
        Downloads an Excel file with two sheets: a detail sheet listing every patient (touchpoints and terminations
        in the selected range, plus each patient&apos;s first-ever HRA/CNA/CCP dates) and a monthly summary sheet
        (total touchpoints, CCPs created, enrollments completed, and members termed, one row per month).
      </p>
      <form action="/api/reports/monthly-activity/export" method="POST" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
          Start Date
          <input
            type="date"
            name="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-500">
          End Date
          <input
            type="date"
            name="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </label>
        <button type="submit" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
          Download Excel
        </button>
      </form>
    </Card>
  );
}
