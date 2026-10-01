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
  // lib/concurrency.ts's assertNotStale throws with this exact message —
  // matched by prefix since the Server Actions error-forwarding path can
  // append a digest-only suffix in production.
  const isStaleWrite = error.message?.startsWith("Someone else saved changes to this record");

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

  // Deliberately NOT an auto-reload like the stale-deploy case above: that
  // would silently wipe the user's view of what they were about to save
  // before they ever read why. They choose when to reload here.
  if (isStaleWrite) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-medium text-charcoal">Someone else saved changes first</h1>
        <p className="max-w-sm text-sm text-stone-500">
          Another user saved this record while you had it open, so your save was not applied — nothing was
          overwritten. Reload to see the latest version before making your changes again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Reload
        </button>
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
