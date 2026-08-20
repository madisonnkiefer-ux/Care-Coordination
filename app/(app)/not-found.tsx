import Link from "next/link";

// Without this, a stale link/bookmark to a deleted or nonexistent record
// (notFound() is thrown from several member-chart pages) falls through to
// Next.js's bare built-in 404 — rendered outside app/(app)/layout.tsx, so
// no sidebar, no way back into the app except the browser's Back button.
// This file is picked up by the (app) route group's layout automatically.
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-lg font-medium text-charcoal">Page not found</h1>
      <p className="max-w-sm text-sm text-stone-500">
        This record may have been deleted, or the link may be out of date.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/members"
          className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Go to Members
        </Link>
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
