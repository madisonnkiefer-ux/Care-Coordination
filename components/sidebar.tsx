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
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-200">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-orange-400" />
        <span className="font-semibold text-slate-900">CareCoord Hub</span>
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
                    ? "bg-fuchsia-50 text-fuchsia-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          }
        )}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{roleLabel(user.role)}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
