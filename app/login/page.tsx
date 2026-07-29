"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { AvanzaLogo } from "@/components/avanza-logo";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <AvanzaLogo className="mx-auto h-32 w-auto" />
          <p className="mt-2 text-center text-sm text-stone-500">Sign in to your care coordination workspace</p>
        </div>

        <form action={formAction} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="officeCode" className="block text-sm font-medium text-stone-700 mb-1">
              Office Code
            </label>
            <input
              id="officeCode"
              name="officeCode"
              type="text"
              autoComplete="off"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-stone-900 text-white text-sm font-medium py-2 hover:bg-stone-800 disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-stone-400">
          Every login is unique to you. Do not share credentials.
        </p>
      </div>
    </div>
  );
}
