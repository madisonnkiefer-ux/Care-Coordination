"use client";

import { useEffect } from "react";
import Link from "next/link";

// Without this, an uncaught render/data-fetch error on any page below the
// (app) layout falls through to Next.js's bare default error screen —
// same dead-end problem as the missing not-found.tsx (see that file):
// no sidebar, no way back into the app. This stays inside the layout, so
// the sidebar/nav is still there to navigate away with.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-lg font-medium text-charcoal">Something went wrong</h1>
      <p className="max-w-sm text-sm text-stone-500">
        This page hit an unexpected error. Your data is unaffected — try again, or go back to the dashboard.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
