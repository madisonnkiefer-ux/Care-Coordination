"use client";

import { useState } from "react";
import { Tabs } from "@/components/tabs";
import { HistoryBar, SignedBanner, SignButton, type HistoryItem } from "@/components/intake/versioning";
import { DemographicsTab } from "@/components/intake/demographics-tab";
import { HraTab } from "@/components/intake/hra-tab";
import { CnaTab } from "@/components/intake/cna-tab";
import { CareCoordinationNotesTab } from "@/components/intake/care-coordination-notes-tab";
import { createNewIntakeVersion, signIntakeVersion } from "@/app/actions/intake";
import type { Demographics, CnaAssessment, HraAssessment, CareCoordinationNote } from "@/app/generated/prisma/client";

type IntakeVersionRecord = {
  id: string;
  createdAt: Date;
  signedAt: Date | null;
  signedBy: { name: string } | null;
  demographics: Demographics | null;
  hra: HraAssessment | null;
  cna: CnaAssessment | null;
  note: CareCoordinationNote | null;
};

const SECTION_LABELS = ["Demographics", "HRA", "CNA", "Care Coordination Notes"] as const;

export function IntakeShell({
  memberId,
  versions,
  currentUserIsAdmin,
  defaultSubTab,
  defaultVersionId,
}: {
  memberId: string;
  versions: IntakeVersionRecord[];
  currentUserIsAdmin: boolean;
  defaultSubTab?: string;
  defaultVersionId?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(defaultVersionId ?? versions[0]?.id ?? null);
  const version = versions.find((v) => v.id === selectedId) ?? versions[0] ?? null;
  const locked = Boolean(version?.signedAt);

  const historyItems: HistoryItem[] = versions.map((v) => ({
    id: v.id,
    dateLabel: v.createdAt,
    status: [v.demographics, v.hra, v.cna, v.note].every((s) => s?.status === "COMPLETED") ? "COMPLETED" : "DRAFT",
    signedAt: v.signedAt,
    signedByName: v.signedBy?.name ?? null,
  }));

  return (
    <div>
      <div className="border-b border-stone-200 bg-white px-8 py-4">
        <HistoryBar
          items={historyItems}
          selectedId={version?.id ?? null}
          onSelect={setSelectedId}
          newAction={createNewIntakeVersion.bind(null, memberId)}
          newLabel="+ New Chart"
        />

        {version && <SignPanel memberId={memberId} version={version} currentUserIsAdmin={currentUserIsAdmin} />}
      </div>

      {!version ? (
        <p className="p-8 text-sm text-stone-500">No chart yet — click &quot;+ New Chart&quot; to start one.</p>
      ) : (
        <Tabs
          defaultTabId={defaultSubTab}
          tabs={[
            {
              id: "demographics",
              label: "Demographics",
              content: version.demographics ? (
                <DemographicsTab memberId={memberId} record={version.demographics} locked={locked} />
              ) : (
                <MissingSection label="Demographics" />
              ),
            },
            {
              id: "hra",
              label: "HRA",
              content: version.hra ? (
                <HraTab memberId={memberId} record={version.hra} locked={locked} />
              ) : (
                <MissingSection label="HRA" />
              ),
            },
            {
              id: "cna",
              label: "CNA",
              content: version.cna ? (
                <CnaTab memberId={memberId} record={version.cna} locked={locked} />
              ) : (
                <MissingSection label="CNA" />
              ),
            },
            {
              id: "notes",
              label: "Care Coordination Notes",
              content: version.note ? (
                <CareCoordinationNotesTab memberId={memberId} record={version.note} locked={locked} />
              ) : (
                <MissingSection label="Care Coordination Notes" />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

function SignPanel({
  memberId,
  version,
  currentUserIsAdmin,
}: {
  memberId: string;
  version: IntakeVersionRecord;
  currentUserIsAdmin: boolean;
}) {
  if (version.signedAt) {
    return (
      <div className="mt-3">
        <SignedBanner signedByName={version.signedBy?.name ?? null} signedAt={version.signedAt} />
      </div>
    );
  }

  const sections = [
    { label: SECTION_LABELS[0], status: version.demographics?.status },
    { label: SECTION_LABELS[1], status: version.hra?.status },
    { label: SECTION_LABELS[2], status: version.cna?.status },
    { label: SECTION_LABELS[3], status: version.note?.status },
  ];
  const allComplete = sections.every((s) => s.status === "COMPLETED");

  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 print:hidden">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        {sections.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className={s.status === "COMPLETED" ? "text-emerald-600" : "text-stone-400"}>
              {s.status === "COMPLETED" ? "✓" : "○"}
            </span>
            {s.label}
          </li>
        ))}
      </ul>

      {allComplete && currentUserIsAdmin ? (
        <SignButton action={signIntakeVersion.bind(null, memberId, version.id)} />
      ) : (
        <span className="text-xs text-stone-400">
          {allComplete ? "Only an admin can sign." : "All four sections must be Completed before this chart can be signed."}
        </span>
      )}
    </div>
  );
}

function MissingSection({ label }: { label: string }) {
  return <p className="p-8 text-sm text-stone-500">This chart is missing its {label} section.</p>;
}
