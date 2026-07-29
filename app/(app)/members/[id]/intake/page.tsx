import { notFound } from "next/navigation";
import { getIntakeFormData } from "@/lib/data/intake";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import { IntakeShell } from "@/components/intake/intake-shell";
import { PrintButton } from "@/components/print-button";

export default async function IntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; version?: string }>;
}) {
  const { id } = await params;
  const { tab, version } = await searchParams;

  const [intakeData, currentUser] = await Promise.all([getIntakeFormData(id), getCurrentUser()]);

  if (!intakeData) notFound();

  const { member, versions } = intakeData;
  const currentUserIsAdmin = currentUser?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Chart"
        description={`${member.firstName} ${member.lastName}`}
        action={<PrintButton label="Print This Form" />}
      />
      <IntakeShell
        memberId={id}
        versions={versions}
        currentUserIsAdmin={currentUserIsAdmin}
        defaultSubTab={tab}
        defaultVersionId={version}
      />
    </div>
  );
}
