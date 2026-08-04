"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { statusBadgeColor } from "@/lib/member-status";
import {
  expectedGraduationReviewDate,
  daysUntilGraduationReview,
  GRADUATION_REVIEW_STATUS_LABEL,
  type GraduationReviewStatus,
} from "@/lib/graduation";
import type { getUpcomingGraduations } from "@/lib/data/graduation";

type Graduations = Awaited<ReturnType<typeof getUpcomingGraduations>>;

type DueWindow = "" | "month" | "30" | "60" | "90" | "overdue";

function isDueThisMonth(reviewDate: Date, now: Date) {
  return reviewDate.getFullYear() === now.getFullYear() && reviewDate.getMonth() === now.getMonth();
}

export function GraduationsCard({ graduations, coordinators }: { graduations: Graduations; coordinators: { id: string; name: string }[] }) {
  const [dueWindow, setDueWindow] = useState<DueWindow>("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [status, setStatus] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"" | GraduationReviewStatus>("");

  const now = useMemo(() => new Date(), []);

  const rows = useMemo(
    () =>
      graduations.map((g) => ({
        ...g,
        expectedReviewDate: expectedGraduationReviewDate(g.deliveryDate),
        daysUntil: daysUntilGraduationReview(g.deliveryDate, now),
      })),
    [graduations, now]
  );

  const activityStatuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);

  const filtered = rows.filter((r) => {
    if (coordinatorId && r.coordinatorId !== coordinatorId) return false;
    if (status && r.status !== status) return false;
    if (reviewStatus && r.reviewStatus !== reviewStatus) return false;
    if (dueWindow === "month" && !isDueThisMonth(r.expectedReviewDate, now)) return false;
    if (dueWindow === "30" && r.daysUntil > 30) return false;
    if (dueWindow === "60" && r.daysUntil > 60) return false;
    if (dueWindow === "90" && r.daysUntil > 90) return false;
    if (dueWindow === "overdue" && r.daysUntil >= 0) return false;
    return true;
  });

  return (
    <Card title="Upcoming Graduations">
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={dueWindow}
          onChange={(e) => setDueWindow(e.target.value as DueWindow)}
          className="rounded-md border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-deep-rose"
        >
          <option value="">Any Time</option>
          <option value="month">Due This Month</option>
          <option value="30">Due Within 30 Days</option>
          <option value="60">Due Within 60 Days</option>
          <option value="90">Due Within 90 Days</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          value={coordinatorId}
          onChange={(e) => setCoordinatorId(e.target.value)}
          className="rounded-md border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-deep-rose"
        >
          <option value="">All Coordinators</option>
          {coordinators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-deep-rose"
        >
          <option value="">All Activity Statuses</option>
          {activityStatuses.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
        <select
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value as "" | GraduationReviewStatus)}
          className="rounded-md border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-deep-rose"
        >
          <option value="">All Review Statuses</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-stone-400">No members match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400">
                <th className="pb-2 pr-3 font-medium">Member</th>
                <th className="pb-2 pr-3 font-medium">DOB</th>
                <th className="pb-2 pr-3 font-medium">Delivery Date</th>
                <th className="pb-2 pr-3 font-medium">Review Date</th>
                <th className="pb-2 pr-3 font-medium">Days</th>
                <th className="pb-2 pr-3 font-medium">Coordinator</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Eligibility</th>
                <th className="pb-2 pr-3 font-medium">Review</th>
                <th className="pb-2 font-medium">Requested Action</th>
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
                  <td className="py-2 pr-3 text-stone-600">{formatDate(r.deliveryDate)}</td>
                  <td className="py-2 pr-3 text-stone-600">{formatDate(r.expectedReviewDate)}</td>
                  <td className="py-2 pr-3">
                    <Badge color={r.daysUntil < 0 ? "red" : "yellow"}>
                      {r.daysUntil < 0 ? `${Math.abs(r.daysUntil)} overdue` : `${r.daysUntil}d`}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-stone-600">{r.coordinatorName}</td>
                  <td className="py-2 pr-3">
                    <Badge color={statusBadgeColor(r.status)}>{titleCase(r.status)}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-stone-600">
                    {r.eligibilityVerified === true ? "Verified" : r.eligibilityVerified === false ? "Unverified" : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge color={r.reviewStatus === "OVERDUE" ? "red" : "yellow"}>{GRADUATION_REVIEW_STATUS_LABEL[r.reviewStatus]}</Badge>
                  </td>
                  <td className="py-2 text-stone-600">
                    {r.pendingRequestToStatus ? `Pending: → ${titleCase(r.pendingRequestToStatus)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
