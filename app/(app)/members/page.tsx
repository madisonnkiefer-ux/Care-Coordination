import { listMembers } from "@/lib/data/members";
import { PageHeader } from "@/components/ui";
import { MemberList } from "@/components/member-list";

export default async function MembersPage() {
  const members = await listMembers();

  return (
    <div>
      <PageHeader title="Member Charts" description={`${members.length} member${members.length === 1 ? "" : "s"}`} />

      <div className="p-8">
        <MemberList members={members} />
      </div>
    </div>
  );
}
