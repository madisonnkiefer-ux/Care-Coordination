import Link from "next/link";
import {
  PhoneCall,
  ListTree,
  ClipboardCheck,
  Activity,
  Upload,
  HeartHandshake,
} from "lucide-react";

export function QuickActionsBar({ memberId }: { memberId: string }) {
  const actions: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; disabled?: boolean }[] = [
    { label: "Log Touchpoint", href: `/members/${memberId}/care-plan?tab=general-communication`, icon: PhoneCall },
    { label: "Update CCP", href: `/members/${memberId}/care-plan?tab=ccp`, icon: ListTree },
    { label: "Complete CNA", href: `/members/${memberId}/intake?tab=cna`, icon: ClipboardCheck },
    { label: "Change in Condition", href: `/members/${memberId}/intake?tab=notes`, icon: Activity },
    { label: "Upload Document", href: `/members/${memberId}#documents`, icon: Upload },
    { label: "Refer to Resource", href: "/resources", icon: HeartHandshake },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-stone-200 bg-white px-8 py-3">
      {actions.map(({ label, href, icon: Icon, disabled }) =>
        disabled ? (
          <span
            key={label}
            className="flex cursor-not-allowed items-center gap-1.5 rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-300"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
        ) : (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-1.5 rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        )
      )}
    </div>
  );
}
