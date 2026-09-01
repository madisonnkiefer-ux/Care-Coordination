"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Card, Badge, StatTile } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { statusBadgeColor, ALL_STATUSES } from "@/lib/member-status";
import { getWindowStart, cnaDueDate } from "@/lib/touchpoint-compliance";
import { monthBounds, trailingMonths, computeCoordinatorRow, computeFunnel, computeTrend, type MemberRef } from "@/lib/team-performance";
import { reassignMember } from "@/app/actions/member-assignment";
import { logBulkExport } from "@/app/actions/export";
import type { getReportsData } from "@/lib/data/reports";

type ReportsData = Awaited<ReturnType<typeof getReportsData>>;
type ReportMember = ReportsData["members"][number];

type ReportId = "roster" | "caseload" | "outreach" | "cna" | "monthly-performance";

const REPORTS: { id: ReportId; label: string }[] = [
  { id: "roster", label: "Active Roster" },
  { id: "caseload", label: "Caseload Distribution" },
  { id: "outreach", label: "Outreach Completion" },
  { id: "cna", label: "Annual CNA Status" },
  { id: "monthly-performance", label: "Monthly Performance" },
];

const ALL_COORDINATORS_ID = "__all__";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function currentQuarterStart() {
  const now = new Date();
  const startMonth = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), startMonth, 1);
}

function currentMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    // A leading =, +, -, or @ is a formula trigger in Excel/Sheets — member
    // names and other free-text fields end up in these exports unvalidated,
    // so without this a crafted name becomes an executing formula the
    // moment staff open the file. The leading apostrophe forces text
    // interpretation without altering the underlying value.
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
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

// Every export button below is generated entirely client-side from data the
// page already fetched via an audited server call — there's no server round
// trip at download time for writeAuditLog (server-only) to hook into. This
// wraps the actual downloadCsv() call so every export still lands in the
// audit trail (EXPORT, with the member IDs it covered), same
// accounting-of-disclosures requirement PRINT logging already covers for
// single-record prints — see app/actions/print.ts / components/print-button.tsx.
async function exportCsv(resource: string, memberIds: string[], filename: string, headers: string[], rows: (string | number)[][]) {
  try {
    await logBulkExport(resource, memberIds);
  } catch (error) {
    console.error("Failed to record export audit event", error);
  }
  downloadCsv(filename, headers, rows);
}

export function ReportsClient({ members, coordinators, programs }: ReportsData) {
  const [active, setActive] = useState<ReportId>("roster");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState(() => toInputDate(currentQuarterStart()));
  const [dateTo, setDateTo] = useState(() => toInputDate(new Date()));
  // Empty = no filter, shows every member's current status (the original
  // behavior). Format matches <input type="month">'s value: "YYYY-MM".
  const [cnaMonth, setCnaMonth] = useState("");

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (coordinatorId && m.coordinatorId !== coordinatorId) return false;
      if (program && m.program !== program) return false;
      if (status && m.status !== status) return false;
      return true;
    });
  }, [members, coordinatorId, program, status]);

  // Monthly Performance always shows every coordinator side by side (or one
  // coordinator's own trend), so it deliberately ignores the Coordinator
  // filter (hidden on that tab, but its state can still be set from another
  // tab) — only Program narrows it. Month/coordinator selection for the
  // snapshot/trends/funnel views inside it is owned by that component.
  const performanceMembers = useMemo(() => {
    return members.filter((m) => !program || m.program === program);
  }, [members, program]);

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

      {active !== "monthly-performance" && (
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

        {active === "cna" && (
          <FilterField label="Completed In">
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={cnaMonth}
                onChange={(e) => setCnaMonth(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
              {cnaMonth && (
                <button type="button" onClick={() => setCnaMonth("")} className="text-xs font-medium text-stone-500 hover:text-charcoal hover:underline">
                  Clear
                </button>
              )}
            </div>
          </FilterField>
        )}

      </div>
      )}

      {active === "roster" && <ActiveRosterReport members={filtered} />}
      {active === "caseload" && (
        <CaseloadDistributionReport members={filtered} allMembers={members} coordinators={coordinators} coordinatorId={coordinatorId} />
      )}
      {active === "outreach" && <OutreachCompletionReport members={filtered} dateFrom={dateFrom} dateTo={dateTo} />}
      {active === "cna" && <AnnualCnaStatusReport members={filtered} month={cnaMonth} />}
      {active === "monthly-performance" && <MonthlyPerformanceReport members={performanceMembers} coordinators={coordinators} />}
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

function ExportButton({ onClick }: { onClick: () => void | Promise<void> }) {
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
  onExport: () => void | Promise<void>;
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
        exportCsv(
          "ActiveRosterReport",
          members.map((m) => m.id),
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

function CaseloadDistributionReport({
  members,
  allMembers,
  coordinators,
  coordinatorId,
}: {
  members: ReportMember[];
  allMembers: ReportMember[];
  coordinators: { id: string; name: string }[];
  coordinatorId: string;
}) {
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

  // Unassigned isn't tied to the Coordinator filter above (there's no
  // "Unassigned" option in that dropdown) — always reflects the true,
  // clinic-wide list regardless of which filters are active, same as the
  // Supervisor Dashboard's "Needs Assignment" panel.
  const unassigned = useMemo(
    () => allMembers.filter((m) => !m.coordinatorId).sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [allMembers]
  );

  // Assignment counts always reflect the true clinic-wide caseload, same
  // reasoning as `unassigned` above — not affected by the filters.
  const assignmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of allMembers) {
      if (m.coordinatorId) counts.set(m.coordinatorId, (counts.get(m.coordinatorId) ?? 0) + 1);
    }
    return counts;
  }, [allMembers]);

  const allMembersSorted = useMemo(
    () => [...allMembers].sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [allMembers]
  );

  const selectedCoordinatorName = coordinatorId ? members[0]?.coordinatorName ?? null : null;

  return (
    <div className="space-y-6">
      <MemberListCard
        title="Unassigned Members"
        members={unassigned}
        filename="unassigned-members.csv"
        emptyMessage="No unassigned members — everyone has a coordinator."
      />

      <Card title="Assign Coordinators">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-400">
              <th className="pb-2 font-medium">Member</th>
              <th className="pb-2 font-medium">Assigned Coordinator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {allMembersSorted.map((m) => (
              <tr key={m.id}>
                <td className="py-2">
                  <Link href={`/members/${m.id}`} className="font-medium text-stone-800 hover:underline">
                    {m.firstName} {m.lastName}
                  </Link>
                </td>
                <td className="py-2">
                  <form
                    key={m.coordinatorId ?? "unassigned"}
                    action={reassignMember.bind(null, m.id)}
                    className="flex items-center gap-2"
                  >
                    <select
                      name="coordinatorId"
                      defaultValue={m.coordinatorId ?? ""}
                      className="rounded-md border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                    >
                      <option value="">Unassigned</option>
                      {coordinators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({assignmentCounts.get(c.id) ?? 0})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ReportShell
        title="Caseload Distribution"
        count={rows.length}
        unit="coordinator"
        emptyMessage="No coordinators match these filters."
        onExport={() =>
          exportCsv(
            "CaseloadDistributionReport",
            members.map((m) => m.id),
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

      {coordinatorId ? (
        <MemberListCard
          title={`${selectedCoordinatorName ?? "Coordinator"}'s Caseload`}
          members={members}
          filename={`caseload-${(selectedCoordinatorName ?? "coordinator").toLowerCase().replace(/\s+/g, "-")}.csv`}
          emptyMessage="This coordinator has no patients."
        />
      ) : (
        <p className="text-xs text-stone-400">Pick a coordinator above to see their individual patient list here.</p>
      )}
    </div>
  );
}

function MemberListCard({
  title,
  members,
  filename,
  emptyMessage,
}: {
  title: string;
  members: ReportMember[];
  filename: string;
  emptyMessage: string;
}) {
  return (
    <ReportShell
      title={title}
      count={members.length}
      emptyMessage={emptyMessage}
      onExport={() =>
        exportCsv(
          "MemberListReport",
          members.map((m) => m.id),
          filename,
          ["Name", "Chart ID", "Program", "Status"],
          members.map((m) => [`${m.firstName} ${m.lastName}`, m.chartId ?? "", m.program ?? "", titleCase(m.status)])
        )
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-400">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Chart ID</th>
            <th className="pb-2 font-medium">Program</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {members.map((m) => (
            <tr key={m.id}>
              <td className="py-2 font-medium text-stone-800">{m.firstName} {m.lastName}</td>
              <td className="py-2 text-stone-600">{m.chartId ?? "—"}</td>
              <td className="py-2 text-stone-600">{m.program ?? "—"}</td>
              <td className="py-2">
                <Badge color={statusBadgeColor(m.status)}>{titleCase(m.status)}</Badge>
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

  const quarterStats = useMemo(() => {
    const now = new Date();
    const monthStart = currentMonthStart();
    let completedThisQuarter = 0;
    let completedThisMonth = 0;
    let notContactedThisQuarter = 0;

    for (const m of members) {
      // Each member's "quarter" is a rolling 3-month cycle counted from
      // their own enrollment date, not the calendar year — see
      // lib/touchpoint-compliance.ts.
      const quarterStart = getWindowStart("quarter", now, m.enrollmentDate);
      let hasSuccessfulThisQuarter = false;
      for (const c of m.contacts) {
        if (!c.successful) continue;
        if (c.createdAt >= quarterStart) {
          completedThisQuarter += 1;
          hasSuccessfulThisQuarter = true;
        }
        if (c.createdAt >= monthStart) completedThisMonth += 1;
      }
      if (!hasSuccessfulThisQuarter) notContactedThisQuarter += 1;
    }

    return { completedThisQuarter, completedThisMonth, notContactedThisQuarter };
  }, [members]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Completed Touchpoints (Quarter)" value={quarterStats.completedThisQuarter} />
        <StatTile label="Completed Touchpoints (Month)" value={quarterStats.completedThisMonth} />
        <StatTile label="Members Not Contacted (Quarter)" value={quarterStats.notContactedThisQuarter} />
      </div>
      <ReportShell
        title={`Outreach Completion (${contactedCount}/${rows.length} contacted in range)`}
        count={rows.length}
        onExport={() =>
          exportCsv(
            "OutreachCompletionReport",
            rows.map((r) => r.id),
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
    </div>
  );
}

function AnnualCnaStatusReport({ members, month }: { members: ReportMember[]; month: string }) {
  const rows = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return members
      .filter((m) => {
        if (!month) return true;
        if (!m.lastCnaDate) return false;
        const key = `${m.lastCnaDate.getFullYear()}-${String(m.lastCnaDate.getMonth() + 1).padStart(2, "0")}`;
        return key === month;
      })
      .map((m) => {
        const dueDate = cnaDueDate(m.lastCnaDate);
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
  }, [members, month]);

  const badgeColor = (c: string) => (c === "Overdue" || c === "Never Completed" ? "red" : c === "Due Soon" ? "yellow" : "green");

  return (
    <ReportShell
      title={month ? `Annual CNA Status — Completed ${month}` : "Annual CNA Status"}
      count={rows.length}
      onExport={() =>
        exportCsv(
          "AnnualCnaStatusReport",
          rows.map((r) => r.id),
          month ? `annual-cna-status-${month}.csv` : "annual-cna-status.csv",
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

function toPerformanceMember(m: ReportMember) {
  return { ...m, name: `${m.firstName} ${m.lastName}` };
}

// A supervisor clicking any "missed outreach, outstanding work, or
// incomplete requirement" number (CNAs Still Due, a funnel stage's
// required/not-attempted count) gets this: the actual members behind it,
// each linking straight to their chart.
function MemberListModal({ title, members, onClose }: { title: string; members: MemberRef[]; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-serif text-lg font-medium text-charcoal">{title}</h2>
          <button type="button" onClick={onClose} className="shrink-0 text-sm text-stone-400 hover:text-charcoal" aria-label="Close">
            X
          </button>
        </div>
        <p className="mb-3 text-xs text-stone-400">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
        {members.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-400">No members.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {members.map((m) => (
              <li key={m.id} className="py-2">
                <Link href={`/members/${m.id}`} className="text-sm font-medium text-charcoal hover:underline">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
}

// A number rendered as a button that opens a MemberListModal listing who
// makes it up -- used for every "missed/outstanding/incomplete" figure.
function DrillableCount({ value, onClick }: { value: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="underline decoration-dotted underline-offset-2 hover:text-charcoal hover:decoration-solid">
      {value}
    </button>
  );
}

type PerformanceMode = "snapshot" | "trends" | "activity";

const PERFORMANCE_MODES: { id: PerformanceMode; label: string }[] = [
  { id: "snapshot", label: "Team Snapshot" },
  { id: "trends", label: "Monthly Trends" },
  { id: "activity", label: "Activity Export" },
];

// Combines what used to be four separate tabs (Monthly Dashboard, Team
// Monthly Snapshot, Monthly Trends, Monthly Activity) into one, since the
// first three were all views of the same underlying month-by-coordinator
// numbers and a supervisor comparing them had to keep re-picking the same
// month on separate tabs. Monthly Dashboard is gone outright — Team
// Snapshot replaced it with the validated definitions (floored %,
// unsuccessful-only attempts, distinct-member touchpoints). Activity
// Export stays its own mode since it's a date-range Excel export, not a
// single-month on-screen table, but lives in the same place since it's
// still "monthly reporting."
function MonthlyPerformanceReport({
  members,
  coordinators,
}: {
  members: ReportMember[];
  coordinators: ReportsData["coordinators"];
}) {
  const [mode, setMode] = useState<PerformanceMode>("snapshot");
  const [month, setMonth] = useState(currentMonthValue);
  const [trendsCoordinatorId, setTrendsCoordinatorId] = useState(ALL_COORDINATORS_ID);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1">
          {PERFORMANCE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === m.id ? "bg-white text-charcoal shadow-sm" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode !== "activity" && (
          <div className="flex flex-wrap items-end gap-3">
            {mode === "trends" && (
              <FilterField label="Coordinator">
                <select
                  value={trendsCoordinatorId}
                  onChange={(e) => setTrendsCoordinatorId(e.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                >
                  <option value={ALL_COORDINATORS_ID}>All coordinators (team)</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FilterField>
            )}
            <FilterField label={mode === "trends" ? "Through Month" : "Month"}>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
            </FilterField>
          </div>
        )}
      </div>

      {mode === "snapshot" && <TeamMonthlySnapshotReport members={members} coordinators={coordinators} month={month} />}
      {mode === "trends" && (
        <MonthlyTrendsReport members={members} coordinators={coordinators} coordinatorId={trendsCoordinatorId} month={month} />
      )}
      {mode === "activity" && <MonthlyActivityReport />}
    </div>
  );
}

function TeamMonthlySnapshotReport({
  members,
  coordinators,
  month,
}: {
  members: ReportMember[];
  coordinators: ReportsData["coordinators"];
  month: string;
}) {
  const [drilldownId, setDrilldownId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; members: MemberRef[] } | null>(null);
  const { monthStart, monthEnd } = useMemo(() => monthBounds(month), [month]);
  const [now] = useState(() => new Date());

  const rows = useMemo(() => {
    return coordinators.map((c) =>
      computeCoordinatorRow(
        c.id,
        c.name,
        members.filter((m) => m.coordinatorId === c.id).map(toPerformanceMember),
        monthStart,
        monthEnd,
        now
      )
    );
  }, [members, coordinators, monthStart, monthEnd, now]);

  const totals = useMemo(() => {
    const ratedRows = rows.filter((r) => r.successRate !== null);
    return {
      members: rows.reduce((s, r) => s + r.members, 0),
      successfulTouchpoints: rows.reduce((s, r) => s + r.successfulTouchpoints, 0),
      successRateAvg: ratedRows.length > 0 ? Math.round(ratedRows.reduce((s, r) => s + (r.successRate ?? 0), 0) / ratedRows.length) : null,
      totalAttempts: rows.reduce((s, r) => s + r.totalAttempts, 0),
      cnasCompleted: rows.reduce((s, r) => s + r.cnasCompleted, 0),
      cnasStillDue: rows.reduce((s, r) => s + r.cnasStillDue, 0),
      cnasStillDueMembers: rows.flatMap((r) => r.cnasStillDueMembers),
    };
  }, [rows]);

  const label = monthLabel(month);

  if (drilldownId) {
    const coordinator = coordinators.find((c) => c.id === drilldownId);
    if (coordinator) {
      return (
        <CoordinatorMonthlySnapshot
          coordinator={coordinator}
          caseload={members.filter((m) => m.coordinatorId === drilldownId)}
          month={month}
          onBack={() => setDrilldownId(null)}
        />
      );
    }
  }

  return (
    <>
    <ReportShell
      title={`Team Monthly Snapshot — ${label}`}
      count={rows.length}
      unit="coordinator"
      emptyMessage="No care coordinators match these filters."
      onExport={() =>
        exportCsv(
          "TeamMonthlySnapshotReport",
          members.map((m) => m.id),
          `team-monthly-snapshot-${month}.csv`,
          ["Care Coordinator", "# of Members", "Total Successful Touchpoints", "% Successful Touchpoints", "Total Attempts", "CNAs Completed", "CNAs Still Due"],
          [
            ...rows.map((r) => [
              r.name,
              r.members,
              r.successfulTouchpoints,
              r.successRate === null ? "—" : `${r.successRate}%`,
              r.totalAttempts,
              r.cnasCompleted,
              r.cnasStillDue,
            ]),
            [
              "Total",
              totals.members,
              totals.successfulTouchpoints,
              totals.successRateAvg === null ? "—" : `Average ${totals.successRateAvg}%`,
              totals.totalAttempts,
              totals.cnasCompleted,
              totals.cnasStillDue,
            ],
          ]
        )
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-400">
            <th className="pb-2 font-medium">Care Coordinator</th>
            <th className="pb-2 font-medium"># of Members</th>
            <th className="pb-2 font-medium">Total Successful Touchpoints</th>
            <th className="pb-2 font-medium">% Successful Touchpoints</th>
            <th className="pb-2 font-medium">Total Attempts</th>
            <th className="pb-2 font-medium">CNAs Completed</th>
            <th className="pb-2 font-medium">CNAs Still Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2 font-medium text-charcoal">
                <button type="button" onClick={() => setDrilldownId(r.id)} className="hover:underline">
                  {r.name}
                </button>
              </td>
              <td className="py-2 text-stone-600">{r.members}</td>
              <td className="py-2 text-stone-600">{r.successfulTouchpoints}</td>
              <td className="py-2 text-stone-600">{r.successRate === null ? "—" : `${r.successRate}%`}</td>
              <td className="py-2 text-stone-600">{r.totalAttempts}</td>
              <td className="py-2 text-stone-600">{r.cnasCompleted}</td>
              <td className="py-2 text-stone-600">
                <DrillableCount
                  value={r.cnasStillDue}
                  onClick={() => setModal({ title: `${r.name} — CNAs Still Due`, members: r.cnasStillDueMembers })}
                />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-stone-200 font-semibold text-charcoal">
            <td className="py-2">Total</td>
            <td className="py-2">{totals.members}</td>
            <td className="py-2">{totals.successfulTouchpoints}</td>
            <td className="py-2">{totals.successRateAvg === null ? "—" : `Average ${totals.successRateAvg}%`}</td>
            <td className="py-2">{totals.totalAttempts}</td>
            <td className="py-2">{totals.cnasCompleted}</td>
            <td className="py-2">
              <DrillableCount
                value={totals.cnasStillDue}
                onClick={() => setModal({ title: "All Coordinators — CNAs Still Due", members: totals.cnasStillDueMembers })}
              />
            </td>
          </tr>
        </tfoot>
      </table>
    </ReportShell>

    {modal && <MemberListModal title={modal.title} members={modal.members} onClose={() => setModal(null)} />}
    </>
  );
}

function CoordinatorMonthlySnapshot({
  coordinator,
  caseload,
  month,
  onBack,
}: {
  coordinator: { id: string; name: string };
  caseload: ReportMember[];
  month: string;
  onBack: () => void;
}) {
  const { monthStart, monthEnd } = useMemo(() => monthBounds(month), [month]);
  const [now] = useState(() => new Date());
  const [modal, setModal] = useState<{ title: string; members: MemberRef[] } | null>(null);
  const performanceCaseload = useMemo(() => caseload.map(toPerformanceMember), [caseload]);
  const row = useMemo(
    () => computeCoordinatorRow(coordinator.id, coordinator.name, performanceCaseload, monthStart, monthEnd, now),
    [coordinator, performanceCaseload, monthStart, monthEnd, now]
  );
  const funnel = useMemo(() => computeFunnel(performanceCaseload, monthStart, monthEnd), [performanceCaseload, monthStart, monthEnd]);
  const label = monthLabel(month);

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 text-sm font-medium text-stone-500 hover:text-charcoal hover:underline">
        ← Back to Team Monthly Snapshot
      </button>

      <h2 className="mb-1 text-lg font-semibold text-charcoal">{coordinator.name}</h2>
      <p className="mb-4 text-sm text-stone-500">Monthly Care Coordinator Performance Snapshot — {label}</p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Assigned Members" value={row.members} />
        <StatTile label="Successful Touchpoints" value={row.successfulTouchpoints} />
        <StatTile label="% Successful" value={row.successRate === null ? "—" : `${row.successRate}%`} />
        <StatTile label="Outreach Attempts" value={row.totalAttempts} />
        <StatTile label="CNAs Completed" value={row.cnasCompleted} />
        <StatTile
          label="CNAs Still Due"
          value={
            <DrillableCount
              value={row.cnasStillDue}
              onClick={() => setModal({ title: `${coordinator.name} — CNAs Still Due`, members: row.cnasStillDueMembers })}
            />
          }
        />
      </div>

      <ReportShell
        title={`Outreach Attempt Funnel — ${label}`}
        count={funnel[0]?.required ?? 0}
        unit="member"
        emptyMessage="No members currently require outreach for this period."
        onExport={() =>
          exportCsv(
            "OutreachAttemptFunnel",
            caseload.map((m) => m.id),
            `outreach-funnel-${coordinator.name.replace(/\s+/g, "-").toLowerCase()}-${month}.csv`,
            ["Outreach Stage", "Members Requiring Attempt", "Attempts Made", "% Completed", "Successful Contacts", "Not Attempted", "% Not Attempted"],
            funnel.map((f) => [
              f.label,
              f.required,
              f.attemptsMade,
              f.percentCompleted === null ? "—" : `${f.percentCompleted}%`,
              f.successful,
              f.notAttempted,
              f.percentNotAttempted === null ? "—" : `${f.percentNotAttempted}%`,
            ])
          )
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-400">
              <th className="pb-2 font-medium">Outreach Stage</th>
              <th className="pb-2 font-medium">Members Requiring Attempt</th>
              <th className="pb-2 font-medium">Attempts Made</th>
              <th className="pb-2 font-medium">% Completed</th>
              <th className="pb-2 font-medium">Successful Contacts</th>
              <th className="pb-2 font-medium">Not Attempted</th>
              <th className="pb-2 font-medium">% Not Attempted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {funnel.map((f) => (
              <tr key={f.stage}>
                <td className="py-2 font-medium text-stone-800">{f.label}</td>
                <td className="py-2 text-stone-600">
                  <DrillableCount
                    value={f.required}
                    onClick={() => setModal({ title: `${coordinator.name} — ${f.label} Required`, members: f.requiredMembers })}
                  />
                </td>
                <td className="py-2 text-stone-600">{f.attemptsMade}</td>
                <td className="py-2 text-stone-600">{f.percentCompleted === null ? "—" : `${f.percentCompleted}%`}</td>
                <td className="py-2 text-stone-600">{f.successful}</td>
                <td className="py-2 text-stone-600">
                  <DrillableCount
                    value={f.notAttempted}
                    onClick={() => setModal({ title: `${coordinator.name} — ${f.label} Not Attempted`, members: f.notAttemptedMembers })}
                  />
                </td>
                <td className="py-2 text-stone-600">{f.percentNotAttempted === null ? "—" : `${f.percentNotAttempted}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportShell>

      {modal && <MemberListModal title={modal.title} members={modal.members} onClose={() => setModal(null)} />}
    </div>
  );
}

const TREND_MONTHS_SHOWN = 6;

function MonthlyTrendsReport({
  members,
  coordinators,
  coordinatorId,
  month,
}: {
  members: ReportMember[];
  coordinators: ReportsData["coordinators"];
  coordinatorId: string;
  month: string;
}) {
  const [now] = useState(() => new Date());
  const months = useMemo(() => trailingMonths(month, TREND_MONTHS_SHOWN), [month]);

  const isTeamWide = coordinatorId === ALL_COORDINATORS_ID;
  const name = isTeamWide ? "All Coordinators (Team)" : (coordinators.find((c) => c.id === coordinatorId)?.name ?? "");
  const caseload = useMemo(() => {
    const scoped = isTeamWide ? members : members.filter((m) => m.coordinatorId === coordinatorId);
    return scoped.map(toPerformanceMember);
  }, [members, coordinatorId, isTeamWide]);

  const points = useMemo(() => computeTrend(coordinatorId, name, caseload, months, now), [coordinatorId, name, caseload, months, now]);

  // 1st Attempt's % Completed for each month — a lightweight read on
  // "attempt follow-through" (are outreach attempts actually getting made,
  // not just whether they land) without a full 3-stage funnel per month.
  const followThrough = useMemo(
    () =>
      months.map((m) => {
        const { monthStart, monthEnd } = monthBounds(m);
        return computeFunnel(caseload, monthStart, monthEnd)[0]?.percentCompleted ?? null;
      }),
    [caseload, months]
  );

  return (
    <ReportShell
      title={`Monthly Trends — ${name}`}
      count={months.length}
      unit="month"
      onExport={() =>
        exportCsv(
          "MonthlyTrendsReport",
          caseload.map((m) => m.id),
          `monthly-trends-${isTeamWide ? "team" : name.replace(/\s+/g, "-").toLowerCase()}-through-${month}.csv`,
          ["Month", "# of Members", "Successful Touchpoints", "% Successful", "Total Attempts", "CNAs Completed", "CNAs Still Due", "1st Attempt Follow-Through %"],
          points.map((p, i) => [
            monthLabel(p.month),
            p.row.members,
            p.row.successfulTouchpoints,
            p.row.successRate === null ? "—" : `${p.row.successRate}%`,
            p.row.totalAttempts,
            p.row.cnasCompleted,
            p.row.cnasStillDue,
            followThrough[i] === null ? "—" : `${followThrough[i]}%`,
          ])
        )
      }
    >
      <p className="mb-3 text-xs text-stone-400">
        # of Members and CNAs Still Due reflect current caseload/due status, not a historical snapshot as of each
        past month — everything else (touchpoints, attempts, CNAs completed, follow-through) is scoped to that
        specific month.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-400">
            <th className="pb-2 font-medium">Month</th>
            <th className="pb-2 font-medium"># of Members</th>
            <th className="pb-2 font-medium">Successful Touchpoints</th>
            <th className="pb-2 font-medium">% Successful</th>
            <th className="pb-2 font-medium">Total Attempts</th>
            <th className="pb-2 font-medium">CNAs Completed</th>
            <th className="pb-2 font-medium">CNAs Still Due</th>
            <th className="pb-2 font-medium">1st Attempt Follow-Through</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {points.map((p, i) => (
            <tr key={p.month} className={p.month === month ? "bg-amber-50/50" : ""}>
              <td className="py-2 font-medium text-stone-800">{monthLabel(p.month)}</td>
              <td className="py-2 text-stone-600">{p.row.members}</td>
              <td className="py-2 text-stone-600">{p.row.successfulTouchpoints}</td>
              <td className="py-2 text-stone-600">{p.row.successRate === null ? "—" : `${p.row.successRate}%`}</td>
              <td className="py-2 text-stone-600">{p.row.totalAttempts}</td>
              <td className="py-2 text-stone-600">{p.row.cnasCompleted}</td>
              <td className="py-2 text-stone-600">{p.row.cnasStillDue}</td>
              <td className="py-2 text-stone-600">{followThrough[i] === null ? "—" : `${followThrough[i]}%`}</td>
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
