"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { EditDateChipButton } from "@/components/intake/versioning";
import { updateIntakeVersionDate } from "@/app/actions/intake";
import { updateTocRecordDate } from "@/app/actions/toc";

export type ChartHistoryEntry = {
  key: string;
  id: string;
  kind: "intake" | "toc" | "careplan" | "document";
  type: "internal" | "external";
  date: Date;
  href: string;
  name: string;
  badge: { label: string; color: "green" | "yellow" | "slate" };
};

// The member chart's "Charts" card — a flat, dated list across every
// record type (Enrollment/intake, TOC, Care Plan, documents). Admin-only,
// same as the pencil on each form's own history bar: lets an admin correct
// the date this entry is filed under (its createdAt), separate from any
// date field inside the record itself. Only "intake" and "toc" entries
// have a correction action wired up — that's the scope the admin
// date-editing feature covers.
export function ChartHistoryList({ entries, memberId, isAdmin }: { entries: ChartHistoryEntry[]; memberId: string; isAdmin: boolean }) {
  return (
    <ul className="divide-y divide-stone-100">
      {entries.map((entry) => {
        const row = (
          <span className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2 text-sm text-stone-700 hover:text-charcoal">
            <span className="min-w-0 truncate">
              <span className="text-stone-400">{formatDate(entry.date)}</span>
              <span className="ml-2 font-medium">{entry.name}</span>
            </span>
            <Badge color={entry.badge.color}>{entry.badge.label}</Badge>
          </span>
        );

        const editAction =
          entry.kind === "intake"
            ? (newDate: string) => updateIntakeVersionDate(memberId, entry.id, newDate)
            : entry.kind === "toc"
              ? (newDate: string) => updateTocRecordDate(memberId, entry.id, newDate)
              : null;

        return (
          <li key={entry.key} className="flex items-center gap-1">
            {entry.type === "external" ? (
              <a href={entry.href} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                {row}
              </a>
            ) : (
              <Link href={entry.href} className="min-w-0 flex-1">
                {row}
              </Link>
            )}
            {isAdmin && editAction && <EditDateChipButton currentDate={entry.date} onConfirm={editAction} />}
          </li>
        );
      })}
    </ul>
  );
}
