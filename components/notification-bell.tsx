"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ListChecks, FileText, PhoneOff } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications";
import { formatDateTime } from "@/lib/format";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  priority: "HIGH" | "STANDARD" | "INFO";
  read: boolean;
  createdAt: Date;
  memberId: string | null;
  linkPath: string | null;
  member: { id: string; firstName: string; lastName: string } | null;
};

const PRIORITY_DOT: Record<NotificationItem["priority"], string> = {
  HIGH: "bg-red-500",
  STANDARD: "bg-amber-500",
  INFO: "bg-stone-300",
};

export function NotificationBell({
  unreadCount,
  recent,
  needsAttention,
}: {
  unreadCount: number;
  recent: NotificationItem[];
  needsAttention: { tasksDueCount: number; annualCnaDueCount: number; notContactedThisQuarterCount: number };
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleClick(n: NotificationItem) {
    setOpen(false);
    if (!n.read) await markNotificationRead(n.id);
    router.push(n.memberId ? `/members/${n.memberId}` : n.linkPath ?? "/notifications");
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-96 rounded-xl border border-stone-200 bg-white shadow-lg">
            <div className="grid grid-cols-3 gap-2 border-b border-stone-100 p-3">
              <AttentionTile icon={ListChecks} label="Tasks Due" value={needsAttention.tasksDueCount} href="/tasks" onNavigate={() => setOpen(false)} />
              <AttentionTile icon={FileText} label="CNAs Due" value={needsAttention.annualCnaDueCount} href="/reports" onNavigate={() => setOpen(false)} />
              <AttentionTile
                icon={PhoneOff}
                label="Not Contacted"
                value={needsAttention.notContactedThisQuarterCount}
                href="/reports"
                onNavigate={() => setOpen(false)}
              />
            </div>

            <div className="max-h-80 overflow-y-auto">
              {recent.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-stone-400">No notifications yet.</p>
              ) : (
                recent.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`flex w-full items-start gap-2.5 border-b border-stone-50 px-4 py-3 text-left text-sm hover:bg-stone-50 ${
                      n.read ? "" : "bg-amber-50/60"
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[n.priority]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-stone-800">{n.title}</span>
                      {n.body && <span className="mt-0.5 block truncate text-xs text-stone-500">{n.body}</span>}
                      <span className="mt-0.5 block text-xs text-stone-400">{formatDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2">
              <a href="/notifications" className="text-xs font-medium text-stone-900 hover:underline" onClick={() => setOpen(false)}>
                View all
              </a>
              {unreadCount > 0 && (
                <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-stone-500 hover:text-stone-900 hover:underline">
                  Mark all as read
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AttentionTile({
  icon: Icon,
  label,
  value,
  href,
  onNavigate,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href: string;
  onNavigate: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onNavigate}
      className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center hover:bg-stone-50"
    >
      <Icon className="h-4 w-4 text-stone-400" />
      <span className="text-sm font-semibold text-stone-900">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-stone-400">{label}</span>
    </a>
  );
}
