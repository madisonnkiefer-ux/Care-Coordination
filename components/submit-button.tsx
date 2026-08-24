"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

// Guards against double-submit on a plain `<form action={...}>` — disables
// itself and swaps its label while the action is in flight. Distinct from
// components/save-button.tsx, which hides itself until the form is dirty;
// this is for one-off action buttons (approve/reject, deactivate, etc.)
// that should always be visible, just not double-clickable.
export function SubmitButton({
  children,
  pendingLabel = "…",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
