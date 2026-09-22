"use client";

import { useEffect, useRef, useState } from "react";

// Every intake-style form (Demographics/HRA/CNA/CC Notes) is uncontrolled
// (plain DOM inputs with `defaultValue`, submitted via a bound Server
// Action) and remounts — wiping every field back to whatever's on the
// server — the moment its `key` changes, on any successful save or on any
// error boundary trip. A Server Action reference embedded in a page goes
// stale the instant the app redeploys ("Failed to find Server Action"),
// which throws on the next Save click and unmounts the form under an error
// boundary before the click ever reaches the server — so typed-but-unsaved
// answers were living only in that DOM tree, gone the moment it unmounts,
// with nothing to recover from.
//
// This mirrors every field into localStorage (per record, debounced) and
// restores it back into the freshly-mounted form when a saved local draft
// is newer than the record's own updatedAt — i.e. exactly the case where
// the last edit never made it to the server. A normal successful save
// bumps updatedAt past the local draft's timestamp, so this self-clears
// and never re-restores what's already safely saved.
type SavedDraft = { savedAt: number; values: Record<string, string[]> };

function serializeForm(form: HTMLFormElement): Record<string, string[]> {
  const values: Record<string, string[]> = {};
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value !== "string") continue; // file inputs aren't worth persisting locally
    (values[key] ??= []).push(value);
  }
  return values;
}

function restoreForm(form: HTMLFormElement, values: Record<string, string[]>) {
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) continue;
    const saved = values[el.name];
    if (!el.name || !saved) continue;

    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      el.checked = saved.includes(el.value);
    } else if (el instanceof HTMLSelectElement && el.multiple) {
      const selected = new Set(saved);
      for (const opt of Array.from(el.options)) opt.selected = selected.has(opt.value);
    } else {
      el.value = saved[0] ?? "";
    }
  }
}

// `storageKey` and `savedAt` are only read at mount — callers key the
// wrapping form with the same record id + updatedAt (already the existing
// pattern here) so a new savedAt always means a fresh mount, and this
// effect re-running from scratch is exactly what's needed.
export function useDraftRecovery(storageKey: string, savedAt: number) {
  const formRef = useRef<HTMLFormElement>(null);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDraft;
        if (parsed.savedAt > savedAt) {
          restoreForm(form, parsed.values);
          // Syncing from an external system (localStorage) that's only
          // readable post-mount — not derivable during render.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRestoredAt(parsed.savedAt);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      // Corrupt entry or localStorage unavailable (private browsing) —
      // degrade to no local autosave rather than blocking the form.
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), values: serializeForm(form) }));
        } catch {
          // Storage full/unavailable — nothing more to do locally.
        }
      }, 400);
    };
    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);
    return () => {
      if (timeout) clearTimeout(timeout);
      form.removeEventListener("input", onChange);
      form.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above: intentionally mount-only.
  }, []);

  return { formRef, restoredAt };
}

export function DraftRestoredBanner({ restoredAt }: { restoredAt: number | null }) {
  if (!restoredAt) return null;
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Restored answers you&apos;d entered but hadn&apos;t saved (from {new Date(restoredAt).toLocaleString()}). Review
      them, then save.
    </div>
  );
}
