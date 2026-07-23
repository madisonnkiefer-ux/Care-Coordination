import type { ReactNode } from "react";
import { initials as getInitials } from "@/lib/format";

export function Card({
  title,
  action,
  children,
  className = "",
  id,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`rounded-2xl border border-stone-100 bg-white p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold text-stone-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {Icon && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50">
          <Icon className="h-5 w-5 text-stone-700" />
        </div>
      )}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
      </div>
    </div>
  );
}

const BADGE_STYLES: Record<string, string> = {
  slate: "bg-stone-100 text-stone-700",
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700",
};

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: keyof typeof BADGE_STYLES }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[color]}`}>
      {children}
    </span>
  );
}

// Muted, professional palette (not saturated brand colors) — still distinct
// enough to tell people apart at a glance in a list.
const AVATAR_COLORS = [
  "bg-rose-100 text-rose-800",
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-800",
  "bg-stone-200 text-stone-800",
];

// Deterministic color per name so the same person always gets the same
// avatar color across the app, without needing to store one anywhere.
function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-sm";

  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${colorForName(name)} ${sizeClasses}`}>
      {getInitials(name) || "?"}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-stone-50/95 px-8 py-5 backdrop-blur-sm">
      <div>
        <h1 className="font-serif text-2xl font-medium text-stone-900">{title}</h1>
        {description && <p className="text-sm text-stone-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
