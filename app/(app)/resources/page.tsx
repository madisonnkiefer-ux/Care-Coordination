import { listResources } from "@/lib/data/resources";
import { verifySession } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import { ResourceList } from "@/components/resource-list";

export default async function ResourcesPage() {
  const [resources, session] = await Promise.all([listResources(), verifySession()]);
  const canEdit = session.permissions.includes("MANAGE_RESOURCES");

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
