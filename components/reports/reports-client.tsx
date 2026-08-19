"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Badge, StatTile } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { statusBadgeColor, ALL_STATUSES } from "@/lib/member-status";
import { getWindowStart } from "@/lib/touchpoint-compliance";
import { reassignMember } from "@/app/actions/member-assignment";
import { logBulkExport } from "@/app/actions/export";
import type { getReportsData } from "@/lib/data/reports";

type ReportsData = Awaited<ReturnType<typeof getReportsData>>;
type ReportMember = ReportsData["members"][number];

type ReportId = "roster" | "caseload" | "outreach" | "cna" | "monthly-activity" | "monthly-dashboard";

const REPORTS: { id: ReportId; label: string }[] = [
  { id: "roster", label: "Active Roster" },
  { id: "caseload", label: "Caseload Distribution" },
  { id: "outreach", label: "Outreach Completion" },
  { id: "cna", label: "Annual CNA Status" },
  { id: "monthly-activity", label: "Monthly Activity" },
  { id: "monthly-dashboard", label: "Monthly Dashboard" },
];

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
  const [dashboardMonth, setDashboardMonth] = useState(currentMonthValue);

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

        {active === "monthly-dashboard" && (
          <FilterField label="Month">
            <input
              type="month"
              value={dashboardMonth}
              onChange={(e) => setDashboardMonth(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
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
      {active === "monthly-dashboard" && <MonthlyDashboardReport members={filtered} coordinators={coordinators} month={dashboardMonth} />}
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

// "Still due" mirrors AnnualCnaStatusReport's own categories, collapsed to
// a single yes/no: never completed, or completed but past its 1-year
// renewal date. Unlike the rest of this report it isn't scoped to the
// selected month — it's each coordinator's current outstanding count.
function isCnaStillDue(lastCnaDate: Date | null, now: Date): boolean {
  if (!lastCnaDate) return true;
  const dueDate = new Date(lastCnaDate.getFullYear() + 1, lastCnaDate.getMonth(), lastCnaDate.getDate());
  return dueDate < now;
}

function MonthlyDashboardReport({
  members,
  coordinators,
  month,
}: {
  members: ReportMember[];
  coordinators: ReportsData["coordinators"];
  month: string;
}) {
  const rows = useMemo(() => {
    const now = new Date();
    const [year, monthNum] = month.split("-").map(Number);
    const monthStart = new Date(year, monthNum - 1, 1);
    const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);
    const inMonth = (d: Date) => d >= monthStart && d <= monthEnd;

    return coordinators.map((c) => {
      const caseload = members.filter((m) => m.coordinatorId === c.id);
      const activePatients = caseload.filter((m) => m.status === "ACTIVE").length;

      let successful = 0;
      let attempts = 0;
      let cnaCompletedInMonth = 0;
      let cnaStillDue = 0;

      for (const m of caseload) {
        const contactsInMonth = m.contacts.filter((contact) => inMonth(contact.createdAt));
        attempts += contactsInMonth.length;
        successful += contactsInMonth.filter((contact) => contact.successful).length;
        cnaCompletedInMonth += m.cnaCompletions.filter(inMonth).length;
        if (isCnaStillDue(m.lastCnaDate, now)) cnaStillDue += 1;
      }

      return {
        id: c.id,
        name: c.name,
        patients: activePatients,
        successful,
        attempts,
        successRate: attempts > 0 ? Math.round((successful / attempts) * 100) : null,
        cnaCompletedInMonth,
        cnaStillDue,
      };
    });
  }, [members, coordinators, month]);

  const label = monthLabel(month);

  return (
    <ReportShell
      title={`Monthly Dashboard — ${label}`}
      count={rows.length}
      unit="coordinator"
      emptyMessage="No care coordinators match these filters."
      onExport={() =>
        exportCsv(
          "MonthlyDashboardReport",
          members.map((m) => m.id),
          `monthly-dashboard-${month}.csv`,
          [
            "Care Coordinator",
            "# of Patients",
            `Total Successful (${label})`,
            "% of Successful Touchpoints",
            `Total Attempts (${label})`,
            `CNAs Completed (${label})`,
            "CNAs Still Due",
          ],
          rows.map((r) => [
            r.name,
            r.patients,
            r.successful,
            r.successRate === null ? "—" : `${r.successRate}%`,
            r.attempts,
            r.cnaCompletedInMonth,
            r.cnaStillDue,
          ])
        )
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-400">
            <th className="pb-2 font-medium">Care Coordinator</th>
            <th className="pb-2 font-medium"># of Patients</th>
            <th className="pb-2 font-medium">Total Successful ({label})</th>
            <th className="pb-2 font-medium">% Successful</th>
            <th className="pb-2 font-medium">Total Attempts ({label})</th>
            <th className="pb-2 font-medium">CNAs Completed ({label})</th>
            <th className="pb-2 font-medium">CNAs Still Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2 font-medium text-stone-800">{r.name}</td>
              <td className="py-2 text-stone-600">{r.patients}</td>
              <td className="py-2 text-stone-600">{r.successful}</td>
              <td className="py-2 text-stone-600">{r.successRate === null ? "—" : `${r.successRate}%`}</td>
              <td className="py-2 text-stone-600">{r.attempts}</td>
              <td className="py-2 text-stone-600">{r.cnaCompletedInMonth}</td>
              <td className="py-2 text-stone-600">{r.cnaStillDue}</td>
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
