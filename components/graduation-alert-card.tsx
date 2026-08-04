import { CalendarClock } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";
import { statusBadgeColor } from "@/lib/member-status";
import { expectedGraduationReviewDate, daysUntilGraduationReview, GRADUATION_REVIEW_STATUS_LABEL } from "@/lib/graduation";
import type { getMemberGraduationInfo } from "@/lib/data/graduation";
import type { MemberStatus } from "@/app/generated/prisma/client";

type GraduationInfo = NonNullable<Awaited<ReturnType<typeof getMemberGraduationInfo>>>;

export function GraduationAlertCard({ info }: { info: GraduationInfo }) {
  const reviewDate = expectedGraduationReviewDate(info.deliveryDate);
  const days = daysUntilGraduationReview(info.deliveryDate);
  const overdue = info.reviewStatus === "OVERDUE";

  return (
    <Card
      className={overdue ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}
      title="Graduation Review"
      action={
        <span className={`flex items-center gap-1.5 text-xs font-medium ${overdue ? "text-red-700" : "text-amber-800"}`}>
          <CalendarClock className="h-3.5 w-3.5" />
          {overdue ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
        </span>
      }
    >
      <p className={`mb-3 text-sm font-medium ${overdue ? "text-red-800" : "text-amber-900"}`}>
        This member is eligible for graduation review — one year post-delivery is{" "}
        {overdue ? "past" : "approaching"}. This does not change their status automatically; a supervisor must
        review and approve any status change.
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <Field label="Delivery Date" value={formatDate(info.deliveryDate)} />
        <Field label="Expected Review Date" value={formatDate(reviewDate)} />
        <Field label="Assigned Coordinator" value={info.assignedCoordinatorName} />
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Current Status</dt>
          <dd>
            <Badge color={statusBadgeColor(info.status as MemberStatus)}>{titleCase(info.status)}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Graduation Review Status</dt>
          <dd>
            <Badge color={overdue ? "red" : "yellow"}>{GRADUATION_REVIEW_STATUS_LABEL[info.reviewStatus]}</Badge>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="text-stone-800">{value}</dd>
    </div>
  );
}
