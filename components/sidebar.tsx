"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  ListChecks,
  ShieldCheck,
  LogOut,
  BookOpen,
  BarChart3,
  Bell,
  Receipt,
  Settings,
  UserCog,
  MapPin,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notification-bell";
import type { Role } from "@/app/generated/prisma/client";
import type { getNotificationBellData } from "@/lib/data/notifications";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/members", label: "Member Charts", icon: Users },
  { href: "/tasks", label: "Tasks & Reminders", icon: ListChecks },
  { href: "/home-visits", label: "Home Visiting", icon: MapPin },
  { href: "/resources", label: "Resources", icon: BookOpen },
  { href: "/notifications", label: "Notifications", icon: Bell },
  {
    href: "/supervisor",
    label: "Supervisor Dashboard",
    icon: ShieldCheck,
    roles: ["SUPERVISOR", "ADMIN"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["SUPERVISOR", "ADMIN"],
  },
  {
    href: "/billing",
    label: "Billing",
    icon: Receipt,
    roles: ["SUPERVISOR", "ADMIN"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export function Sidebar({
  user,
  notificationData,
}: {
  user: { name: string; email: string; role: Role };
  notificationData: Awaited<ReturnType<typeof getNotificationBellData>>;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-stone-200 bg-white flex flex-col h-screen sticky top-0 print:hidden">
      <div className="flex items-center justify-between gap-1.5 px-4 h-16 border-b border-stone-200">
        <div className="flex min-w-0 items-center gap-2">
          <Image src="/avanza-mark.png" alt="" width={32} height={26} className="h-8 w-auto shrink-0" />
          <span className="truncate font-serif text-sm font-bold tracking-wide text-charcoal">AVANZA CARE</span>
        </div>
        <NotificationBell
          unreadCount={notificationData.unreadCount}
          recent={notificationData.recent}
          needsAttention={notificationData.needsAttention}
        />
      </div>

      <nav className="overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role)).map(
          (item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-charcoal text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-charcoal"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          }
        )}
      </nav>

      <div className="border-t border-stone-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-charcoal">{user.name}</p>
            <p className="truncate text-xs text-stone-500">{roleLabel(user.role)}</p>
          </div>
        </div>
        <Link
          href="/account"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            pathname.startsWith("/account")
              ? "bg-charcoal text-white"
              : "text-stone-500 hover:bg-stone-100 hover:text-charcoal"
          }`}
        >
          <UserCog className="h-4 w-4" />
          Account &amp; Security
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-charcoal"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function roleLabel(role: Role) {
  switch (role) {
    case "CARE_COORDINATOR":
      return "Care Coordinator";
    case "SUPERVISOR":
      return "Supervisor";
    case "ADMIN":
      return "Admin";
  }
}
