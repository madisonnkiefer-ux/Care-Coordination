"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Feeds FloatingSaveBar's `savedConfirmation` prop. Call this from the tab
// component itself (e.g. `const justSaved = useSavedConfirmation(draft.updatedAt);`),
// never from inside the `<form key={...}>` it wraps — that form remounts on
// every successful save, which would reset any state living inside it back
// to nothing before the confirmation could ever be seen. The tab component
// doesn't remount (only its inner form does), so it's the right place to
// notice the prop actually changing across a save and hold a brief "Saved"
// flag for a couple seconds.
export function useSavedConfirmation(updatedAt: Date): boolean {
  const [justSaved, setJustSaved] = useState(false);
  const prevRef = useRef(updatedAt.getTime());

  useEffect(() => {
    const t = updatedAt.getTime();
    if (t === prevRef.current) return;
    prevRef.current = t;
    setJustSaved(true);
    const timeout = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(timeout);
  }, [updatedAt]);

  return justSaved;
}

// Pins its children (a form's save button(s)) to a fixed corner of the
// viewport so they're reachable without scrolling to the bottom of a long
// form, and scrolls the page back to the top whenever this mounts. That
// happens once on initial load (a no-op, the page is already at the top)
// and again after every successful save — the forms this wraps are keyed
// on the record's updatedAt, so a successful save remounts this along with
// the rest of the form.
//
// `savedConfirmation` renders a brief "Saved" pill alongside the buttons —
// pass a boolean from a parent that does NOT remount on save (the tab
// component itself, not this or the form it wraps) so the confirmation
// survives long enough to be seen. See each *-tab.tsx's own `useEffect`
// comparing the record's updatedAt across renders for how that's derived.
export function FloatingSaveBar({ children, savedConfirmation }: { children: ReactNode; savedConfirmation?: boolean }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-stone-200 bg-white/95 p-2 shadow-lg backdrop-blur print:hidden">
      {savedConfirmation && (
        <span className="flex items-center gap-1 pl-2 text-sm font-medium text-emerald-600">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
          Saved
        </span>
      )}
      {children}
    </div>
  );
}
