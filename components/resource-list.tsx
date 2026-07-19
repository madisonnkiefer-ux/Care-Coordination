"use client";

import { useMemo, useState } from "react";
import { Search, Phone, Mail, Trash2 } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { createResource, updateResource, deleteResource } from "@/app/actions/resources";
import type { ResourceEntry } from "@/app/generated/prisma/client";

const CATEGORY_OPTIONS = [
  "Pregnancy/Maternity Program",
  "Home Visiting Program",
  "Food/Nutrition",
  "Parenting Support",
  "Maternity/OB Service",
  "Referral Contact",
  "Crisis/Emergency",
  "Behavioral Health",
  "Administrative",
  "Housing",
  "Travel/Logistics",
  "Rewards/Incentives",
  "Health Monitoring",
  "Community Resource",
  "Internal Tool",
  "Other",
];

export function ResourceList({ resources, canEdit }: { resources: ResourceEntry[]; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [addingNew, setAddingNew] = useState(false);

  const categories = useMemo(() => Array.from(new Set(resources.map((r) => r.category))).sort(), [resources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (category && r.category !== category) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.contactName?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [resources, query, category]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources, contacts, programs…"
            className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {canEdit && (
          <button
            type="button"
            onClick={() => setAddingNew((v) => !v)}
            className="ml-auto rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            {addingNew ? "Cancel" : "+ Add Resource"}
          </button>
        )}
      </div>

      {addingNew && canEdit && (
        <div className="mb-4">
          <ResourceForm
            action={async (formData) => {
              await createResource(formData);
              setAddingNew(false);
            }}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-stone-400">
          {resources.length === 0 ? "No resources yet." : "No resources match your search."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceCard({ resource, canEdit }: { resource: ResourceEntry; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ResourceForm
        resource={resource}
        action={async (formData) => {
          await updateResource(resource.id, formData);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">{resource.name}</p>
          <Badge color="fuchsia">{resource.category}</Badge>
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-stone-900 hover:underline">
              Edit
            </button>
            <form
              action={async () => {
                if (confirm(`Delete "${resource.name}"?`)) await deleteResource(resource.id);
              }}
            >
              <button type="submit" aria-label="Delete resource" className="text-stone-400 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {resource.description && <p className="mt-2 text-sm text-stone-600">{resource.description}</p>}

      {(resource.contactName || resource.contactPhone || resource.contactEmail) && (
        <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm text-stone-600">
          {resource.contactName && <p className="font-medium text-stone-700">{resource.contactName}</p>}
          {resource.contactPhone && (
            <p className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-stone-400" /> {resource.contactPhone}
            </p>
          )}
          {resource.contactEmail && (
            <p className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-stone-400" /> {resource.contactEmail}
            </p>
          )}
        </div>
      )}

      {resource.eligibility && (
        <p className="mt-2 text-xs text-stone-500">
          <span className="font-medium">Eligibility:</span> {resource.eligibility}
        </p>
      )}
      {resource.notes && <p className="mt-1 text-xs text-stone-400">{resource.notes}</p>}
    </Card>
  );
}

function ResourceForm({
  resource,
  action,
  onCancel,
}: {
  resource?: ResourceEntry;
  action: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <Card>
      <form action={action} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Name</label>
            <input
              name="name"
              required
              defaultValue={resource?.name ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Category</label>
            <select
              name="category"
              defaultValue={resource?.category ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              <option value="">—</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Description</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={resource?.description ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Contact Name</label>
            <input
              name="contactName"
              defaultValue={resource?.contactName ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Phone</label>
            <input
              name="contactPhone"
              defaultValue={resource?.contactPhone ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Email</label>
            <input
              name="contactEmail"
              defaultValue={resource?.contactEmail ?? ""}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Eligibility</label>
          <input
            name="eligibility"
            defaultValue={resource?.eligibility ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Notes</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={resource?.notes ?? ""}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
