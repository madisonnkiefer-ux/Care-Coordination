"use client";

import { useEffect } from "react";

// Root-level error boundary — catches anything app/(app)/error.tsx can't,
// including errors on /login and errors thrown by the root layout itself.
// Without this, those fall through to Next's bare unstyled error screen.
//
// A "Failed to find Server Action" error means the page the browser has
// loaded is from an older deploy than what's running on the server now —
// its embedded action ID no longer exists server-side. This happens to
// anyone who had a tab open (or a bfcache-restored page) across a deploy.
// The fix isn't "try again" — reset() would just re-run the same stale
// action and fail again — it's a full reload to fetch the current build.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const isStaleDeploy = error.message?.includes("Failed to find Server Action");

  useEffect(() => {
    console.error(error);
    if (isStaleDeploy) {
      window.location.reload();
    }
  }, [error, isStaleDeploy]);

  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-cream p-8 text-center">
          <h1 className="text-lg font-medium text-charcoal">
            {isStaleDeploy ? "Refreshing to the latest version…" : "Something went wrong"}
          </h1>
          <p className="max-w-sm text-sm text-taupe">
            {isStaleDeploy
              ? "This page was open before the app was last updated. Reloading it now."
              : "An unexpected error occurred. Try reloading the page."}
          </p>
          {!isStaleDeploy && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-deep-rose"
            >
              Reload
            </button>
          )}
        </div>
      </body>
    </html>
  );
}
