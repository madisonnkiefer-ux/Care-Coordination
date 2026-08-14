"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { createUser, updateUserRole, setUserActive, resetUserPassword, unlockUser } from "@/app/actions/users";
import { adminResetMfa } from "@/app/actions/mfa";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Role } from "@/app/generated/prisma/client";

const ROLE_LABELS: Record<Role, string> = {
  CARE_COORDINATOR: "Care Coordinator",
  SUPERVISOR: "Supervisor",
  ADMIN: "Admin",
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [Role, string][];

type ClinicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  lockedUntil: Date | null;
  mfaEnabled: boolean;
};

export function UsersTab({ users, currentUserId }: { users: ClinicUser[]; currentUserId: string }) {
  return (
    <div className="space-y-6 p-8">
      <Card title="Add User">
        <NewUserForm />
      </Card>

      <Card title="All Users">
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Password</th>
                <th className="px-4 py-3 font-medium">2FA</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 text-stone-800">
                    {u.name} {u.id === currentUserId && <span className="text-xs text-stone-400">(you)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{u.email}</td>
                  <td className="px-4 py-2.5">
                    {u.id === currentUserId ? (
                      <Badge color="slate">{ROLE_LABELS[u.role]}</Badge>
                    ) : (
                      <form key={u.role} action={updateUserRole.bind(null, u.id)} className="flex items-center gap-2">
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="rounded-md border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-deep-rose"
                        >
                          {ROLE_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                        >
                          Save
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {u.id === currentUserId ? (
                        <Badge color={u.active ? "green" : "slate"}>{u.active ? "Active" : "Deactivated"}</Badge>
                      ) : (
                        <form action={setUserActive.bind(null, u.id)}>
                          <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                          <button
                            type="submit"
                            className={`rounded-md border px-2 py-1 text-xs font-medium ${
                              u.active
                                ? "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                                : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {u.active ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                      )}
                      {u.lockedUntil && u.lockedUntil > new Date() && (
                        <>
                          <Badge color="red">Locked</Badge>
                          <form action={unlockUser.bind(null, u.id)}>
                            <button
                              type="submit"
                              className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                            >
                              Unlock
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <ResetPasswordControl userId={u.id} />
                  </td>
                  <td className="px-4 py-2.5">
                    {u.mfaEnabled ? (
                      <div className="flex items-center gap-1.5">
                        <Badge color="green">On</Badge>
                        <form action={adminResetMfa.bind(null, u.id)}>
                          <button
                            type="submit"
                            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Reset
                          </button>
                        </form>
                      </div>
                    ) : (
                      <Badge color="slate">Off</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-stone-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-stone-500">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/settings?tab=audit&user=${u.id}`} className="text-xs font-medium text-charcoal hover:underline">
                      View log →
                    </Link>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-stone-400">
                    No users yet.
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

function ResetPasswordControl({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(resetUserPassword.bind(null, userId), undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
      >
        Reset Password
      </button>
    );
  }

  if (state?.success) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-emerald-700">Password updated</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-stone-500 underline hover:text-stone-700"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          name="password"
          required
          minLength={8}
          placeholder="New password"
          autoFocus
          className="w-32 rounded-md border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-deep-rose"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          Cancel
        </button>
      </div>
      {state?.error && (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

function NewUserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Name</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Email</label>
          <input
            type="email"
            name="email"
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
            name="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Role</label>
          <select
            name="role"
            defaultValue="CARE_COORDINATOR"
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          >
            {ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <p className="text-xs text-stone-500">
        Share this password with the new user directly — there&apos;s no email invite flow yet, so they&apos;ll sign in with
        it and your clinic&apos;s office code.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
