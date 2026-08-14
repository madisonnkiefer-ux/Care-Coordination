"use client";

import { useActionState, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { createVendor, updateVendor, setVendorActive } from "@/app/actions/vendors";
import { formatDate, toDateInputValue } from "@/lib/format";

type Vendor = {
  id: string;
  name: string;
  purpose: string | null;
  hasBaa: boolean;
  baaSignedDate: Date | null;
  baaExpiresAt: Date | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
};

const EXPIRING_SOON_DAYS = 60;

function baaBadge(vendor: Vendor) {
  if (!vendor.hasBaa) return <Badge color="red">No BAA on file</Badge>;
  if (vendor.baaExpiresAt) {
    const daysUntilExpiry = Math.floor((vendor.baaExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysUntilExpiry < 0) return <Badge color="red">BAA expired</Badge>;
    if (daysUntilExpiry <= EXPIRING_SOON_DAYS) return <Badge color="yellow">BAA expires soon</Badge>;
  }
  return <Badge color="green">BAA on file</Badge>;
}

export function VendorsTab({ vendors }: { vendors: Vendor[] }) {
  const activeVendors = vendors.filter((v) => v.active);
  const retiredVendors = vendors.filter((v) => !v.active);
  const missingBaaCount = activeVendors.filter((v) => !v.hasBaa).length;

  return (
    <div className="space-y-6 p-8">
      <p className="max-w-2xl text-sm text-stone-500">
        Any third party that creates, receives, maintains, or transmits PHI on the clinic&apos;s behalf (hosting,
        backups, fax/e-fax, billing clearinghouse, etc.) needs a signed Business Associate Agreement. Track that
        here so it doesn&apos;t depend on someone&apos;s memory or inbox.
      </p>

      {missingBaaCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">
            {missingBaaCount} active vendor{missingBaaCount === 1 ? "" : "s"} missing a signed BAA.
          </p>
        </Card>
      )}

      <Card title="Add Vendor">
        <NewVendorForm />
      </Card>

      <Card title="Active Vendors">
        <VendorTable vendors={activeVendors} emptyLabel="No vendors on file yet." />
      </Card>

      {retiredVendors.length > 0 && (
        <Card title="Retired Vendors">
          <VendorTable vendors={retiredVendors} emptyLabel="" />
        </Card>
      )}
    </div>
  );
}

function VendorTable({ vendors, emptyLabel }: { vendors: Vendor[]; emptyLabel: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
          <tr>
            <th className="px-4 py-3 font-medium">Vendor</th>
            <th className="px-4 py-3 font-medium">BAA Status</th>
            <th className="px-4 py-3 font-medium">Signed / Expires</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {vendors.map((v) => (
            <VendorRow key={v.id} vendor={v} />
          ))}
          {vendors.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-stone-400">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function VendorRow({ vendor }: { vendor: Vendor }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateVendor.bind(null, vendor.id), undefined);

  if (editing) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-3">
          <VendorForm
            action={formAction}
            pending={pending}
            error={state?.error}
            defaultValues={vendor}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-2.5">
        <div className="text-stone-800">{vendor.name}</div>
        {vendor.purpose && <div className="text-xs text-stone-400">{vendor.purpose}</div>}
      </td>
      <td className="px-4 py-2.5">{baaBadge(vendor)}</td>
      <td className="px-4 py-2.5 whitespace-nowrap text-stone-500">
        {formatDate(vendor.baaSignedDate)} — {formatDate(vendor.baaExpiresAt)}
      </td>
      <td className="px-4 py-2.5 text-stone-600">
        {vendor.contactName || vendor.contactEmail ? (
          <>
            {vendor.contactName}
            {vendor.contactName && vendor.contactEmail && " · "}
            {vendor.contactEmail}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            Edit
          </button>
          <form action={setVendorActive.bind(null, vendor.id, !vendor.active)}>
            <button
              type="submit"
              className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              {vendor.active ? "Retire" : "Reactivate"}
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function NewVendorForm() {
  const [state, formAction, pending] = useActionState(createVendor, undefined);
  return <VendorForm action={formAction} pending={pending} error={state?.error} submitLabel="Add Vendor" />;
}

function VendorForm({
  action,
  pending,
  error,
  defaultValues,
  submitLabel,
  onCancel,
}: {
  action: (formData: FormData) => void;
  pending?: boolean;
  error?: string;
  defaultValues?: Vendor;
  submitLabel: string;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
            Vendor Name
          </label>
          <input
            name="name"
            required
            defaultValue={defaultValues?.name}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
            Purpose / What They Touch
          </label>
          <input
            name="purpose"
            placeholder="e.g. Cloud hosting, database backups"
            defaultValue={defaultValues?.purpose ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
            BAA Signed Date
          </label>
          <input
            type="date"
            name="baaSignedDate"
            defaultValue={toDateInputValue(defaultValues?.baaSignedDate)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
            BAA Expires / Renews
          </label>
          <input
            type="date"
            name="baaExpiresAt"
            defaultValue={toDateInputValue(defaultValues?.baaExpiresAt)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
            Vendor Contact Name
          </label>
          <input
            name="contactName"
            defaultValue={defaultValues?.contactName ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
            Vendor Contact Email
          </label>
          <input
            type="email"
            name="contactEmail"
            defaultValue={defaultValues?.contactEmail ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Notes</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={defaultValues?.notes ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="hasBaa"
          defaultChecked={defaultValues?.hasBaa ?? false}
          className="rounded border-stone-300"
        />
        Signed BAA is on file
      </label>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-600">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
