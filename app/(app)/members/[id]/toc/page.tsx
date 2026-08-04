import { notFound } from "next/navigation";
import { getTocFormData } from "@/lib/data/toc";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import { TocForm } from "@/components/toc/toc-form";
import { PrintButton } from "@/components/print-button";

export default async function TocPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { id } = await params;
  const { version } = await searchParams;

  const [tocData, currentUser] = await Promise.all([getTocFormData(id), getCurrentUser()]);
  if (!tocData) notFound();

  const { member, records } = tocData;
  const currentUserIsAdmin = currentUser?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Transition of Care (TOC)"
        description={`${member.firstName} ${member.lastName}`}
        action={<PrintButton label="Print This TOC" />}
      />
      <TocForm memberId={id} records={records} currentUserIsAdmin={currentUserIsAdmin} defaultVersionId={version} />
    </div>
  );
}
