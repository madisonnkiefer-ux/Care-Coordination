"use client";

import { useEffect } from "react";
import Link from "next/link";

// Without this, an uncaught render/data-fetch error on any page below the
// (app) layout falls through to Next.js's bare default error screen —
// same dead-end problem as the missing not-found.tsx (see that file):
// no sidebar, no way back into the app. This stays inside the layout, so
// the sidebar/nav is still there to navigate away with.
//
// "Failed to find Server Action" means this page's embedded action ID
// predates the app's current deploy (see app/global-error.tsx, which
// handles the same error at the root boundary) — reset() would just
// re-invoke that same stale action and fail again, so a full reload is
// the only way out. This one specifically hits form pages (Demographics/
// HRA/CNA/CC Notes save through a bound Server Action), where the reload
// wipes whatever was still unsaved in the form's DOM — that's what
// components/intake/draft-recovery.tsx's autosave-to-localStorage exists
// to survive, so it's safe to reload straight away rather than leave the
// user stuck on a broken retry loop.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isStaleDeploy = error.message?.includes("Failed to find Server Action");

  useEffect(() => {
    console.error(error);
    if (isStaleDeploy) {
      window.location.reload();
    }
  }, [error, isStaleDeploy]);

  if (isStaleDeploy) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-medium text-charcoal">Refreshing to the latest version…</h1>
        <p className="max-w-sm text-sm text-stone-500">
          This page was open before the app was last updated. Reloading it now — any unsaved answers on this form will
          be restored automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-lg font-medium text-charcoal">Something went wrong</h1>
      <p className="max-w-sm text-sm text-stone-500">
        This page hit an unexpected error. Try again, or go back to the dashboard.
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
