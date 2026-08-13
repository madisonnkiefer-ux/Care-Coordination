"use client";

import { useEffect, type ReactNode } from "react";

// Pins its children (a form's save button(s)) to a fixed corner of the
// viewport so they're reachable without scrolling to the bottom of a long
// form, and scrolls the page back to the top whenever this mounts. That
// happens once on initial load (a no-op, the page is already at the top)
// and again after every successful save — the forms this wraps are keyed
// on the record's updatedAt, so a successful save remounts this along with
// the rest of the form.
export function FloatingSaveBar({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-stone-200 bg-white/95 p-2 shadow-lg backdrop-blur print:hidden">
      {children}
    </div>
  );
}
