"use client";

import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui";
import { markNotificationRead } from "@/app/actions/notifications";
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

const PRIORITY_BADGE: Record<NotificationItem["priority"], { color: "red" | "yellow" | "slate"; label: string }> = {
  HIGH: { color: "red", label: "High" },
  STANDARD: { color: "yellow", label: "Standard" },
  INFO: { color: "slate", label: "Info" },
};

export function NotificationsList({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();

  async function handleClick(n: NotificationItem) {
    if (!n.read) await markNotificationRead(n.id);
    if (n.memberId) router.push(`/members/${n.memberId}`);
    else if (n.linkPath) router.push(n.linkPath);
    else router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <p className="py-10 text-center text-sm text-stone-400">No notifications yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-stone-100">
        {notifications.map((n) => {
          const badge = PRIORITY_BADGE[n.priority];
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleClick(n)}
                className={`flex w-full items-start justify-between gap-4 px-1 py-3 text-left hover:bg-stone-50 ${n.read ? "" : "bg-amber-50/60"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-800">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-stone-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-stone-400">{formatDateTime(n.createdAt)}</p>
                </div>
                <Badge color={badge.color}>{badge.label}</Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
