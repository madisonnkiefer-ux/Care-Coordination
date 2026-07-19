import { notFound } from "next/navigation";
import { getTocFormData } from "@/lib/data/toc";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import { TocForm } from "@/components/toc/toc-form";

export default async function TocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [tocData, currentUser] = await Promise.all([getTocFormData(id), getCurrentUser()]);
  if (!tocData) notFound();

  const { member, records } = tocData;
  const currentUserIsAdmin = currentUser?.role === "ADMIN";

  return (
    <div>
      <PageHeader title="Transition of Care (TOC)" description={`${member.firstName} ${member.lastName}`} />
      <TocForm memberId={id} records={records} currentUserIsAdmin={currentUserIsAdmin} />
    </div>
  );
}
