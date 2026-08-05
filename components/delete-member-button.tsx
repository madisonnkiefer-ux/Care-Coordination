"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { deleteMember } from "@/app/actions/delete";

// Collapse whitespace and ignore case so a typed name matches even if the
// stored name has stray/irregular whitespace that isn't visible on screen.
function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function DeleteMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canConfirm = confirmText.trim().length > 0 && normalize(confirmText) === normalize(memberName);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Delete Chart
      </button>

      {/* Portaled to document.body — PageHeader (this button's ancestor) has
          backdrop-blur-sm, and a backdrop-filter on an ancestor creates a new
          containing block for position:fixed descendants, which would trap
          this modal inside PageHeader's small bounding box instead of the
          viewport. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
              <h2 className="font-serif text-lg font-medium text-charcoal">Delete this chart?</h2>
              <p className="mt-2 text-sm text-stone-600">
                This removes <strong>{memberName}</strong>&apos;s entire chart — every form, assessment, note, and
                document — from every list, dashboard, and report immediately. It&apos;s recoverable by an admin
                from Settings, not permanently erased, but treat this as if it were: this is not for members whose
                care has ended (use the member&apos;s status for that), only for charts created in error.
              </p>
              <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Type <span className="font-semibold text-stone-600">{memberName}</span> to confirm
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
              {confirmText.length > 0 && !canConfirm && (
                <p className="mt-1 text-xs text-stone-400">Doesn&apos;t match yet.</p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setConfirmText("");
                  }}
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <form action={deleteMember.bind(null, memberId)}>
                  <button
                    type="submit"
                    disabled={!canConfirm}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete Chart
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
