"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

// Hidden until the enclosing form is actually edited. The Overview form is
// remounted (via a `key` tied to member.updatedAt) after every successful
// save, so a fresh mount with no edits yet means "nothing to save" — the
// button reappears the moment the user changes a field again.
export function SaveButton({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  const [dirty, setDirty] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = anchorRef.current?.closest("form");
    if (!form) return;
    const onEdit = () => setDirty(true);
    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    return () => {
      form.removeEventListener("input", onEdit);
      form.removeEventListener("change", onEdit);
    };
  }, []);

  if (!dirty && !pending) {
    return <div ref={anchorRef} />;
  }

  return (
    <div ref={anchorRef}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-charcoal px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}
