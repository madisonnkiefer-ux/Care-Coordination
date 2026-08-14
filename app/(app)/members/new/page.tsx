import { listActiveCoordinators } from "@/lib/data/members";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import { NewMemberForm } from "@/components/members/new-member-form";

export default async function NewMemberPage() {
  const [coordinators, currentUser] = await Promise.all([listActiveCoordinators(), getCurrentUser()]);

  return (
    <div>
      <PageHeader title="Add New Patient" description="Create a new member record to begin intake." />

      <div className="max-w-2xl p-8">
        <NewMemberForm coordinators={coordinators} currentUserRole={currentUser?.role} />
      </div>
    </div>
  );
}
