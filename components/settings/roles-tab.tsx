"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { saveRolePermissions, createRole, saveCustomRolePermissions, removeCustomRole } from "@/app/actions/permissions";
import { PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_LABELS } from "@/lib/permissions";
import type { Permission, Role } from "@/app/generated/prisma/client";

type BuiltInRole = { role: Role; permissions: Permission[] };
type CustomRole = {
  id: string;
  name: string;
  basedOn: Role;
  permissions: Permission[];
  _count: { users: number };
};

export function RolesTab({ builtInRoles, customRoles }: { builtInRoles: BuiltInRole[]; customRoles: CustomRole[] }) {
  return (
    <div className="space-y-6 p-8">
      <p className="max-w-3xl text-sm text-stone-500">
        Control which pages and admin actions each role can reach. This doesn&apos;t touch a few things that are
        always tied to the role itself, not a setting: who can sign a chart (Admin only), the care-coordinator-
        requests / supervisor-approves status-change workflow, and whether someone sees their own caseload or the
        whole clinic&apos;s.
      </p>

      <Card title="Built-in Roles">
        <div className="space-y-6">
          {builtInRoles.map((r) => (
            <RolePermissionForm
              key={r.role}
              title={ROLE_LABELS[r.role]}
              initialPermissions={r.permissions}
              action={saveRolePermissions.bind(null, r.role)}
            />
          ))}
        </div>
      </Card>

      <Card title="Custom Roles">
        <div className="space-y-6">
          {customRoles.length === 0 && <p className="text-sm text-stone-400">No custom roles yet.</p>}
          {customRoles.map((r) => (
            <div key={r.id} className="rounded-lg border border-stone-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-charcoal">{r.name}</p>
                  <Badge color="fuchsia">Based on {ROLE_LABELS[r.basedOn]}</Badge>
                  <span className="text-xs text-stone-400">
                    {r._count.users} {r._count.users === 1 ? "user" : "users"}
                  </span>
                </div>
                <form action={removeCustomRole.bind(null, r.id)}>
                  <button
                    type="submit"
                    disabled={r._count.users > 0}
                    title={r._count.users > 0 ? "Reassign every user off this role before deleting it." : "Delete role"}
                    className="text-stone-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
              <RolePermissionForm
                initialPermissions={r.permissions}
                action={saveCustomRolePermissions.bind(null, r.id)}
              />
            </div>
          ))}
          <NewRoleForm />
        </div>
      </Card>
    </div>
  );
}

type PermissionFormState = { error?: string; success?: boolean } | undefined;

function RolePermissionForm({
  title,
  initialPermissions,
  action,
}: {
  title?: string;
  initialPermissions: Permission[];
  action: (state: PermissionFormState, formData: FormData) => Promise<PermissionFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [checked, setChecked] = useState<Set<Permission>>(new Set(initialPermissions));

  function toggle(p: Permission) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-3">
      {title && <p className="text-sm font-semibold text-charcoal">{title}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-400">{group.label}</p>
            <div className="space-y-1">
              {group.permissions.map((p) => (
                <label key={p} className="flex items-start gap-2 text-xs text-stone-600">
                  <input
                    type="checkbox"
                    name={p}
                    checked={checked.has(p)}
                    onChange={() => toggle(p)}
                    className="mt-0.5 rounded border-stone-300 text-deep-rose focus:ring-deep-rose"
                  />
                  {PERMISSION_LABELS[p]}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-charcoal px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state?.success && <span className="text-xs font-medium text-emerald-700">Saved</span>}
        {state?.error && (
          <span className="text-xs text-red-600" role="alert">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

function NewRoleForm() {
  const [state, formAction, pending] = useActionState(createRole, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-stone-100 pt-4">
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Role Name</label>
        <input
          name="name"
          required
          placeholder="e.g. Regional Supervisor"
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Clone From</label>
        <select
          name="basedOn"
          defaultValue="CARE_COORDINATOR"
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
        >
          {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "+ Create Custom Role"}
      </button>
      {state?.error && (
        <span className="text-xs text-red-600" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
