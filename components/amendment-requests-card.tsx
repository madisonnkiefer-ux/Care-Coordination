import { Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { createAmendmentRequest } from "@/app/actions/amendment-requests";
import { AMENDMENT_RESPONSE_DAYS } from "@/lib/amendment-requests-shared";

type AmendmentRequest = {
  id: string;
  description: string;
  status: "OPEN" | "ACCEPTED" | "DENIED";
  resolution: string | null;
  createdAt: Date;
  requestedBy: { name: string };
  resolvedBy: { name: string } | null;
};

function dueByBadge(request: AmendmentRequest) {
  if (request.status !== "OPEN") {
    return <Badge color={request.status === "ACCEPTED" ? "green" : "slate"}>{request.status === "ACCEPTED" ? "Accepted" : "Denied"}</Badge>;
  }
  const dueBy = new Date(request.createdAt.getTime() + AMENDMENT_RESPONSE_DAYS * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((dueBy.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return <Badge color="red">Overdue (due {formatDate(dueBy)})</Badge>;
  if (daysLeft <= 14) return <Badge color="yellow">Due {formatDate(dueBy)}</Badge>;
  return <Badge color="slate">Due {formatDate(dueBy)}</Badge>;
}

export function AmendmentRequestsCard({ memberId, requests }: { memberId: string; requests: AmendmentRequest[] }) {
  return (
    <Card id="amendment-requests" title="Amendment Requests" className="print:hidden">
      <p className="mb-3 text-xs text-stone-500">
        Log it here if this member (or their representative) asks to correct something in their record. HIPAA
        requires a response within {AMENDMENT_RESPONSE_DAYS} days.
      </p>
      {requests.length > 0 && (
        <ul className="mb-3 space-y-2 border-b border-stone-100 pb-3">
          {requests.map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-stone-700">{r.description}</p>
                {dueByBadge(r)}
              </div>
              <p className="mt-0.5 text-xs text-stone-400">
                Logged by {r.requestedBy.name} · {formatDate(r.createdAt)}
              </p>
              {r.status !== "OPEN" && r.resolution && (
                <p className="mt-1 rounded-md bg-stone-50 px-2 py-1 text-xs text-stone-600">
                  Resolution ({r.resolvedBy?.name}): {r.resolution}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <form action={createAmendmentRequest.bind(null, memberId)} className="space-y-2">
        <textarea
          name="description"
          required
          rows={2}
          placeholder="What does the patient want corrected, and in which record?"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
        />
        <button
          type="submit"
          className="rounded-md bg-charcoal px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
        >
          Log Request
        </button>
      </form>
    </Card>
  );
}
