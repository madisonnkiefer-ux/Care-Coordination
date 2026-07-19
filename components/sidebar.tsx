"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  ListChecks,
  ShieldCheck,
  ClipboardList,
  LogOut,
  HeartHandshake,
  BookOpen,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Avatar } from "@/components/ui";
import type { Role } from "@/app/generated/prisma/client";

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
  { href: "/resources", label: "Resources", icon: BookOpen },
  {
    href: "/supervisor",
    label: "Supervisor Dashboard",
    icon: ShieldCheck,
    roles: ["SUPERVISOR", "ADMIN"],
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: ClipboardList,
    roles: ["SUPERVISOR", "ADMIN"],
  },
];

export function Sidebar({
  user,
}: {
  user: { name: string; email: string; role: Role };
}) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-stone-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-stone-200">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-900">
          <HeartHandshake className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold tracking-wide text-stone-900">CARECOORD HUB</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
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
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
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
            <p className="truncate text-sm font-medium text-stone-900">{user.name}</p>
            <p className="truncate text-xs text-stone-500">{roleLabel(user.role)}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900"
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
