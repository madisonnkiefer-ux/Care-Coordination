import Link from "next/link";
import { UserPlus } from "lucide-react";
import { listMembers } from "@/lib/data/members";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import { MemberList } from "@/components/member-list";

export default async function MembersPage() {
  const [members, currentUser] = await Promise.all([listMembers(), getCurrentUser()]);

  return (
    <div>
      <PageHeader
        title="Member Charts"
        description={`${members.length} member${members.length === 1 ? "" : "s"}`}
        action={
          <Link
            href="/members/new"
            className="flex items-center gap-2 rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            <UserPlus className="h-4 w-4" />
            Add New Patient
          </Link>
        }
      />

      <div className="p-8">
        <MemberList members={members} currentUserId={currentUser?.id ?? null} />
      </div>
    </div>
  );
}
