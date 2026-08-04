"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { statusBadgeColor } from "@/lib/member-status";
import { filterBillingRows, type BillingFilters } from "@/lib/billing";
import { setBillingExclusion } from "@/app/actions/billing";
import type { getBillingRoster } from "@/lib/data/billing";

type BillingData = Awaited<ReturnType<typeof getBillingRoster>>;

function currentBillingMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function BillingClient({ rows, coordinators, insurancePlans }: BillingData) {
  const [billingMonth, setBillingMonth] = useState(currentBillingMonth);
  const [status, setStatus] = useState("");
  const [insurancePlan, setInsurancePlan] = useState("");
  const [eligibilityVerified, setEligibilityVerified] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [billingInclusion, setBillingInclusion] = useState("");
  const [excludingId, setExcludingId] = useState<string | null>(null);

  const activityStatuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);

  const filtered = useMemo(() => {
    const filters: BillingFilters = { status, insurancePlan, eligibilityVerified, coordinatorId, billingInclusion };
    return filterBillingRows(rows, filters);
  }, [rows, status, insurancePlan, eligibilityVerified, coordinatorId, billingInclusion]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Billing Month</label>
            <input
              type="month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <FilterSelect label="Activity Status" value={status} onChange={setStatus}>
            <option value="">All Statuses</option>
            {activityStatuses.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Insurance Plan" value={insurancePlan} onChange={setInsurancePlan}>
            <option value="">All Plans</option>
            {insurancePlans.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Eligibility Status" value={eligibilityVerified} onChange={setEligibilityVerified}>
            <option value="">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </FilterSelect>
          <FilterSelect label="Care Coordinator" value={coordinatorId} onChange={setCoordinatorId}>
            <option value="">All Coordinators</option>
            {coordinators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Billing Inclusion" value={billingInclusion} onChange={setBillingInclusion}>
            <option value="">Included &amp; Excluded</option>
            <option value="included">Included Only</option>
            <option value="excluded">Excluded Only</option>
          </FilterSelect>

          <form action="/api/billing/export" method="POST" className="ml-auto">
            <input type="hidden" name="billingMonth" value={billingMonth} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="insurancePlan" value={insurancePlan} />
            <input type="hidden" name="eligibilityVerified" value={eligibilityVerified} />
            <input type="hidden" name="coordinatorId" value={coordinatorId} />
            <input type="hidden" name="billingInclusion" value={billingInclusion} />
            <button type="submit" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
              Export to Excel ({filtered.length})
            </button>
          </form>
        </div>
      </Card>

      <Card title={`Billing Roster (${filtered.length})`}>
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-400">No members match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400">
                  <th className="pb-2 pr-3 font-medium">Member</th>
                  <th className="pb-2 pr-3 font-medium">DOB</th>
                  <th className="pb-2 pr-3 font-medium">Address</th>
                  <th className="pb-2 pr-3 font-medium">Phone</th>
                  <th className="pb-2 pr-3 font-medium">Insurance Plan</th>
                  <th className="pb-2 pr-3 font-medium">Medicaid ID</th>
                  <th className="pb-2 pr-3 font-medium">Subscriber ID</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Eligibility</th>
                  <th className="pb-2 pr-3 font-medium">Enrolled</th>
                  <th className="pb-2 pr-3 font-medium">Termed</th>
                  <th className="pb-2 pr-3 font-medium">Graduated</th>
                  <th className="pb-2 pr-3 font-medium">Coordinator</th>
                  <th className="pb-2 pr-3 font-medium">Billing</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3">
                      <Link href={`/members/${r.id}`} className="font-medium text-stone-800 hover:underline">
                        {r.firstName} {r.lastName}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-stone-600">{formatDate(r.dateOfBirth)}</td>
                    <td className="py-2 pr-3 max-w-[14rem] truncate text-stone-600">{r.address ?? "—"}</td>
                    <td className="py-2 pr-3 text-stone-600">{r.phone ?? "—"}</td>
                    <td className="py-2 pr-3 text-stone-600">{r.insurancePlan ?? "—"}</td>
                    <td className="py-2 pr-3 text-stone-600">{r.medicaidId ?? "—"}</td>
                    <td className="py-2 pr-3 text-stone-600">{r.subscriberId ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge color={statusBadgeColor(r.status)}>{titleCase(r.status)}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-stone-600">
                      {r.eligibilityVerified === true ? "Verified" : r.eligibilityVerified === false ? "Unverified" : "—"}
                    </td>
                    <td className="py-2 pr-3 text-stone-600">{formatDate(r.enrollmentDate)}</td>
                    <td className="py-2 pr-3 text-stone-600">{r.terminationDate ? formatDate(r.terminationDate) : "—"}</td>
                    <td className="py-2 pr-3 text-stone-600">{r.graduationDate ? formatDate(r.graduationDate) : "—"}</td>
                    <td className="py-2 pr-3 text-stone-600">{r.coordinatorName}</td>
                    <td className="py-2 pr-3">
                      <Badge color={r.billingEligible ? "green" : "slate"}>{r.billingEligible ? "Included" : "Excluded"}</Badge>
                      {!r.billingEligible && r.billingExclusionReason && (
                        <p className="mt-0.5 text-xs text-stone-400">{r.billingExclusionReason}</p>
                      )}
                    </td>
                    <td className="py-2">
                      {excludingId === r.id ? (
                        <form
                          action={async (formData) => {
                            await setBillingExclusion(r.id, formData);
                            setExcludingId(null);
                          }}
                          className="flex items-center gap-1"
                        >
                          <input type="hidden" name="excluded" value="true" />
                          <input
                            type="text"
                            name="reason"
                            placeholder="Reason"
                            required
                            autoFocus
                            className="w-28 rounded-md border border-stone-300 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-deep-rose"
                          />
                          <button type="submit" className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100">
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setExcludingId(null)}
                            className="text-xs text-stone-400 hover:text-stone-600"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : r.billingExcluded ? (
                        <form action={setBillingExclusion.bind(null, r.id)}>
                          <input type="hidden" name="excluded" value="false" />
                          <button type="submit" className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50">
                            Include
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExcludingId(r.id)}
                          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                        >
                          Exclude
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
      >
        {children}
      </select>
    </div>
  );
}
