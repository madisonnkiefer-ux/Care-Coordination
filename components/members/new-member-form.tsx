"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui";
import { createMember } from "@/app/actions/create-member";
import { titleCase } from "@/lib/format";
import { ALL_STATUSES } from "@/lib/member-status";
import { PATIENT_TYPE_OPTIONS } from "@/lib/patient-type";
import type { Role } from "@/app/generated/prisma/client";

export function NewMemberForm({
  coordinators,
  currentUserRole,
}: {
  coordinators: { id: string; name: string }[];
  currentUserRole: Role | undefined;
}) {
  const [state, formAction, pending] = useActionState(createMember, undefined);

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              First Name
            </label>
            <input
              name="firstName"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Last Name
            </label>
            <input
              name="lastName"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Phone</label>
            <input
              name="phone"
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Medicaid ID
            </label>
            <input
              name="medicaidId"
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Chart ID
            </label>
            <input
              name="memberIdExternal"
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Type of Patient
            </label>
            <select
              name="program"
              defaultValue=""
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
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Subscriber ID
            </label>
            <input
              name="subscriberId"
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Due Date (if prenatal)
            </label>
            <input
              type="date"
              name="edd"
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Status</label>
            <select
              name="status"
              defaultValue="PENDING_ENROLLMENT"
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              CCL Level
            </label>
            <select
              name="cclLevel"
              defaultValue=""
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            >
              <option value="">—</option>
              <option value="CCL1">CCL1</option>
              <option value="CCL2">CCL2</option>
              <option value="CCL3">CCL3</option>
              <option value="HIGH_RISK">High Risk</option>
            </select>
          </div>
          {currentUserRole !== "CARE_COORDINATOR" && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Assigned Care Coordinator
              </label>
              <select
                name="assignedCoordinatorId"
                defaultValue=""
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              >
                <option value="">Unassigned</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {state?.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create Patient"}
          </button>
        </div>
      </form>
    </Card>
  );
}
