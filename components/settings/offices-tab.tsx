"use client";

import { useActionState, useState } from "react";
import { Card } from "@/components/ui";
import { createOffice, updateOffice } from "@/app/actions/offices";
import { formatDate } from "@/lib/format";

type Office = {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  _count: { users: number };
};

export function OfficesTab({ offices }: { offices: Office[] }) {
  return (
    <div className="space-y-6 p-8">
      <Card title="Add Office">
        <NewOfficeForm />
      </Card>

      <Card title="All Offices">
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Office</th>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {offices.map((o) => (
                <OfficeRow key={o.id} office={o} />
              ))}
              {offices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-stone-400">
                    No offices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function OfficeRow({ office }: { office: Office }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateOffice.bind(null, office.id), undefined);

  if (editing) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-3">
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Office Name
              </label>
              <input
                name="officeName"
                required
                defaultValue={office.name}
                className="rounded-md border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Office Code
              </label>
              <input
                name="officeCode"
                required
                defaultValue={office.code}
                className="w-32 rounded-md border border-stone-300 px-2 py-1 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-charcoal px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Cancel
            </button>
            {state?.error && (
              <p className="w-full text-xs text-red-600" role="alert">
                {state.error}
              </p>
            )}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-2.5">
        <div className="text-stone-800">{office.name}</div>
        <div className="text-xs uppercase tracking-wide text-stone-400">{office.code}</div>
      </td>
      <td className="px-4 py-2.5 text-stone-600">{office._count.users}</td>
      <td className="px-4 py-2.5 whitespace-nowrap text-stone-500">{formatDate(office.createdAt)}</td>
      <td className="px-4 py-2.5 text-right">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

function NewOfficeForm() {
  const [state, formAction, pending] = useActionState(createOffice, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">Office</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Office Name
            </label>
            <input
              name="officeName"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Office Code
            </label>
            <input
              name="officeCode"
              required
              placeholder="e.g. AVANZA02"
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">First Admin for This Office</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Name</label>
            <input
              name="adminName"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Email</label>
            <input
              type="email"
              name="adminEmail"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              Temporary Password
            </label>
            <input
              type="text"
              name="adminPassword"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <p className="text-xs text-stone-500">
        This admin signs in with this office&apos;s code, their email, and this password — they&apos;re scoped to this
        office only and won&apos;t see other offices&apos; data.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create Office"}
      </button>
    </form>
  );
}
