"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { updateMemberOverview } from "@/app/actions/member-details";
import { PATIENT_TYPE_OPTIONS } from "@/lib/patient-type";
import { formatDate, toDateInputValue } from "@/lib/format";

type MemberOverview = {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string | null;
  medicaidId: string | null;
  memberIdExternal: string | null;
  subscriberId: string | null;
  program: string | null;
  language: string | null;
  edd: Date | null;
  cclLevel: string | null;
};

function patientTypeLabel(value: string | null) {
  return PATIENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function ViewField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="text-sm text-stone-800">{value || "—"}</p>
    </div>
  );
}

// Edit-mode toggle so the card reads as plain member info by default (per
// the redesign direction) instead of always showing raw form inputs — the
// underlying save action and its fields are unchanged, this only changes
// when they're rendered as inputs vs. plain text.
export function MemberInfoCard({ memberId, member }: { memberId: string; member: MemberOverview }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <Card
        title="Member Information"
        action={
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 print:hidden"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ViewField label="First Name" value={member.firstName} />
          <ViewField label="Last Name" value={member.lastName} />
          <ViewField label="Date of Birth" value={formatDate(member.dateOfBirth)} />
          <ViewField label="Phone" value={member.phone} />
          <ViewField label="Medicaid ID" value={member.medicaidId} />
          <ViewField label="Chart ID" value={member.memberIdExternal} />
          <ViewField label="Subscriber ID" value={member.subscriberId} />
          <ViewField label="Type of Patient" value={patientTypeLabel(member.program)} />
          <ViewField label="Language" value={member.language} />
          <ViewField label="Due Date (if prenatal)" value={member.edd ? formatDate(member.edd) : null} />
          <ViewField label="CCL Level" value={member.cclLevel} />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Member Information">
      <form action={updateMemberOverview.bind(null, memberId)} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">First Name</label>
          <input
            name="firstName"
            required
            defaultValue={member.firstName}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Last Name</label>
          <input
            name="lastName"
            required
            defaultValue={member.lastName}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Date of Birth</label>
          <input
            type="date"
            name="dateOfBirth"
            required
            defaultValue={toDateInputValue(member.dateOfBirth)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Phone</label>
          <input
            name="phone"
            defaultValue={member.phone ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Medicaid ID</label>
          <input
            name="medicaidId"
            defaultValue={member.medicaidId ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Chart ID</label>
          <input
            name="memberIdExternal"
            defaultValue={member.memberIdExternal ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Subscriber ID</label>
          <input
            name="subscriberId"
            defaultValue={member.subscriberId ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Type of Patient</label>
          <select
            name="program"
            defaultValue={member.program ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          >
            <option value="">—</option>
            {PATIENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Language</label>
          <input
            name="language"
            defaultValue={member.language ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Due Date (if prenatal)</label>
          <input
            type="date"
            name="edd"
            defaultValue={toDateInputValue(member.edd)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">CCL Level</label>
          <select
            name="cclLevel"
            defaultValue={member.cclLevel ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          >
            <option value="">—</option>
            <option value="CCL0">CCL0</option>
            <option value="CCL1">CCL1</option>
            <option value="CCL2">CCL2</option>
            <option value="CCL4">CCL4</option>
            <option value="CCL5">CCL5</option>
            {member.cclLevel === "CCL3" && <option value="CCL3">CCL3</option>}
            {member.cclLevel === "HIGH_RISK" && <option value="HIGH_RISK">High Risk</option>}
          </select>
        </div>
        <div className="flex items-end justify-end gap-2 sm:col-span-3 print:hidden">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <SubmitButton
            pendingLabel="Saving…"
            className="rounded-md bg-deep-rose px-3 py-1.5 text-xs font-medium text-white hover:bg-deep-rose-dark disabled:opacity-50"
          >
            Save
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
