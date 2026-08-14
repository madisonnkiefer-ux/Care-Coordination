"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { logout } from "@/app/actions/auth";
import { SESSION_EXPIRY_COOKIE_NAME } from "@/lib/session-shared";

// Mirrors lib/session.ts's IDLE_TIMEOUT_MINUTES: the warning appears this
// long before the (server-enforced) idle logoff actually happens.
const WARNING_WINDOW_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

function readExpiryCookie(): number | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_EXPIRY_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  const value = Number(decodeURIComponent(match[1]));
  return Number.isFinite(value) ? value : null;
}

// Purely a UX affordance — the actual idle-timeout enforcement lives
// server-side in proxy.ts, which slides the session forward on every
// authenticated request and redirects to /login once it's truly expired.
// This just reads that same expiry (mirrored into a non-httpOnly cookie)
// so the user gets a chance to stay signed in instead of being silently
// bounced mid-task.
export function SessionTimeoutWarning() {
  const router = useRouter();
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loggedOutRef = useRef(false);
  const sawSessionRef = useRef(false);

  const triggerLogout = useCallback(() => {
    if (loggedOutRef.current) return;
    loggedOutRef.current = true;
    // A plain navigation, not the logout Server Action — by the time this
    // fires, proxy.ts already sees no valid session (the real httpOnly
    // cookie expires on the same clock as the one this component reads)
    // and will redirect any request to /login on its own. Calling
    // logout() here instead races that: proxy.ts intercepts the action's
    // POST first and answers with a redirect instead of the RSC action
    // response the client expected, surfacing as a console error.
    router.push("/login");
  }, [router]);

  // Manual "Log Out Now" click. Unlike the auto-trigger above, the session
  // is usually still valid here (the user hasn't actually timed out yet),
  // so it's worth firing the real Server Action to clear the cookie and
  // audit-log the logout server-side. But it's fire-and-forget: this can
  // still lose the same proxy.ts race in the last seconds before expiry —
  // that used to leave the button looking like it did nothing — so
  // navigation never waits on the action's response.
  function manualLogout() {
    if (loggedOutRef.current) return;
    loggedOutRef.current = true;
    logout().catch(() => {});
    router.push("/login");
  }

  useEffect(() => {
    function tick() {
      const expiresAt = readExpiryCookie();
      if (expiresAt === null) {
        setMsLeft(null);
        // The cookie's own Max-Age matches the idle window, so the browser
        // drops it at essentially the same instant `remaining` would hit
        // zero below — meaning that branch can't be relied on to ever
        // observe a last non-negative reading. Once we've seen a live
        // session, its disappearance IS the expiry signal.
        if (sawSessionRef.current) triggerLogout();
        return;
      }
      sawSessionRef.current = true;
      const remaining = expiresAt - Date.now();
      setMsLeft(remaining);
      if (remaining <= 0) triggerLogout();
    }

    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, triggerLogout]);

  const showWarning = msLeft !== null && msLeft > 0 && msLeft <= WARNING_WINDOW_MS;
  if (!showWarning) return null;

  const totalSeconds = Math.max(0, Math.ceil(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="font-serif text-lg font-medium text-charcoal">Still there?</h2>
        <p className="mt-2 text-sm text-stone-600">
          You&apos;ve been inactive for a while. To protect patient information, you&apos;ll be signed out in{" "}
          <span className="font-semibold text-charcoal">{display}</span>.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={manualLogout}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Log Out Now
          </button>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              router.refresh();
              // The refresh's response resets the expiry cookie — the next
              // poll tick picks it up and closes this modal automatically.
              setTimeout(() => setRefreshing(false), 2000);
            }}
            className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
