import { listResources } from "@/lib/data/resources";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import { ResourceList } from "@/components/resource-list";

export default async function ResourcesPage() {
  const [resources, currentUser] = await Promise.all([listResources(), getCurrentUser()]);
  const canEdit = currentUser?.role === "ADMIN" || currentUser?.role === "SUPERVISOR";

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Referral programs, contacts, and resources for care coordination"
      />
      <div className="p-8">
        <ResourceList resources={resources} canEdit={canEdit} />
      </div>
    </div>
  );
}
