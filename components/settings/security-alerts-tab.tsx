import { Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { BulkAccessAlert, OutOfCaseloadAlert, FailedLoginAlert } from "@/lib/data/security-alerts";

// `day` strings are "YYYY-MM-DD" — parsed via year/month/day parts rather
// than handed straight to `new Date()` so this always lands on the same
// calendar day formatDate then renders, regardless of the server's
// timezone interpretation of a bare date string.
function formatDayString(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return formatDate(new Date(year, month - 1, date));
}

export function SecurityAlertsTab({
  bulkAccessAlerts,
  outOfCaseloadAlerts,
  failedLoginAlerts,
  lookbackDays,
}: {
  bulkAccessAlerts: BulkAccessAlert[];
  outOfCaseloadAlerts: OutOfCaseloadAlert[];
  failedLoginAlerts: FailedLoginAlert[];
  lookbackDays: number;
}) {
  const totalAlerts = bulkAccessAlerts.length + outOfCaseloadAlerts.length + failedLoginAlerts.length;

  return (
    <div className="space-y-6 p-8">
      <p className="max-w-2xl text-sm text-stone-500">
        Automated checks against the audit trail for the last {lookbackDays} days — unusually high record access,
        access outside a coordinator&apos;s own caseload, and repeated failed sign-in attempts. These are signals
        worth a look, not proof of wrongdoing: covering a colleague&apos;s patients or a busy day can also trip
        them.
      </p>

      {totalAlerts === 0 && (
        <Card>
          <p className="py-6 text-center text-sm text-stone-400">No anomalies detected in the last {lookbackDays} days.</p>
        </Card>
      )}

      {bulkAccessAlerts.length > 0 && (
        <Card title="Unusually High Record Access">
          <p className="mb-3 text-xs text-stone-500">
            A coordinator viewed more distinct patient charts in a single day than their own caseload would
            explain.
          </p>
          <AlertTable
            headers={["Coordinator", "Date", "Distinct Patients Viewed", "Caseload Size"]}
            rows={bulkAccessAlerts.map((a) => [
              a.userName,
              formatDayString(a.day),
              <Badge key="count" color="red">{a.distinctPatients}</Badge>,
              a.caseloadSize,
            ])}
          />
        </Card>
      )}

      {outOfCaseloadAlerts.length > 0 && (
        <Card title="Access Outside Assigned Caseload">
          <p className="mb-3 text-xs text-stone-500">
            A coordinator viewed multiple patients not assigned to them in a single day.
          </p>
          <AlertTable
            headers={["Coordinator", "Date", "Distinct Non-Caseload Patients"]}
            rows={outOfCaseloadAlerts.map((a) => [a.userName, formatDayString(a.day), <Badge key="count" color="yellow">{a.distinctOutsidePatients}</Badge>])}
          />
        </Card>
      )}

      {failedLoginAlerts.length > 0 && (
        <Card title="Repeated Failed Sign-In Attempts">
          <p className="mb-3 text-xs text-stone-500">Possible brute-force activity against an account.</p>
          <AlertTable
            headers={["User", "Date", "Failed Attempts", "Status"]}
            rows={failedLoginAlerts.map((a) => [
              `${a.userName} (${a.email})`,
              formatDayString(a.day),
              <Badge key="count" color="red">{a.count}</Badge>,
              a.currentlyLocked ? <Badge key="status" color="red">Currently Locked</Badge> : <Badge key="status" color="slate">Resolved</Badge>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

function AlertTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-stone-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
