"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { saveGeneralCommunication, createNewGeneralCommunication } from "@/app/actions/general-communication";
import type { GeneralCommunication } from "@/app/generated/prisma/client";
import { SimpleHistoryBar } from "@/components/intake/versioning";
import { formatDateTime } from "@/lib/format";

type CommRecord = GeneralCommunication & { author: { name: string } | null };

export function GeneralCommunicationTab({ memberId, records }: { memberId: string; records: CommRecord[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const record = records.find((r) => r.id === selectedId) ?? records[0] ?? null;

  const historyItems = records.map((r) => ({ id: r.id, dateLabel: r.createdAt }));

  return (
    <div className="p-8">
      <SimpleHistoryBar
        items={historyItems}
        selectedId={record?.id ?? null}
        onSelect={setSelectedId}
        newAction={createNewGeneralCommunication.bind(null, memberId)}
        newLabel="+ New Entry"
      />

      {!record ? (
        <p className="text-sm text-slate-500">No General Communication entries yet — click &quot;+ New Entry&quot; to start one.</p>
      ) : (
        <form action={saveGeneralCommunication.bind(null, memberId, record.id)} className="max-w-4xl space-y-4">
          <Card title="General Communication">
            <p className="mb-3 text-xs text-slate-400">
              Started {formatDateTime(record.createdAt)} by {record.author?.name ?? "unknown"}
              {record.updatedAt > record.createdAt && ` · last updated ${formatDateTime(record.updatedAt)}`}
            </p>
            <textarea
              name="body"
              defaultValue={record.body ?? ""}
              rows={20}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </Card>
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Save
          </button>
        </form>
      )}
    </div>
  );
}
