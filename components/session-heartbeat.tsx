"use client";

import { useEffect, useRef } from "react";
import { heartbeat } from "@/app/actions/auth";

// How often to check for activity and, if there's been any, ping the
// server. Comfortably under IDLE_TIMEOUT_MINUTES so a session never lapses
// between checks even while the user is genuinely active.
const CHECK_INTERVAL_MS = 60_000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

// Keeps the idle-timeout window sliding forward for real user activity that
// doesn't happen to trigger a fresh navigation — see app/actions/auth.ts's
// heartbeat() for why that's not as automatic as it sounds (Next.js's
// client Router Cache serves repeat visits to already-loaded pages without
// a network request, so proxy.ts's own cookie-refresh never runs for those).
export function SessionHeartbeat() {
  const lastActivityRef = useRef(0);
  const lastHeartbeatRef = useRef(0);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    lastHeartbeatRef.current = Date.now();

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, markActive, { passive: true });
    }

    const interval = setInterval(() => {
      if (lastActivityRef.current > lastHeartbeatRef.current) {
        lastHeartbeatRef.current = Date.now();
        heartbeat().catch(() => {});
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, markActive);
      }
      clearInterval(interval);
    };
  }, []);

  return null;
}
