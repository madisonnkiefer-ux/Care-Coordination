import { notFound } from "next/navigation";
import { getTocFormData } from "@/lib/data/toc";
import { getCurrentUser, verifySession } from "@/lib/dal";
import { getFormFieldOverrides } from "@/lib/data/form-fields";
import { getActiveCustomQuestionDefs, getCustomAnswersByRecord } from "@/lib/data/custom-questions";
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

  const session = await verifySession();
  const [tocData, currentUser, fields] = await Promise.all([
    getTocFormData(id),
    getCurrentUser(),
    getFormFieldOverrides(session.clinicId),
  ]);
  if (!tocData) notFound();

  const { member, records } = tocData;
  const currentUserIsAdmin = currentUser?.role === "ADMIN";

  const [customQuestionDefs, customAnswersByRecord] = await Promise.all([
    getActiveCustomQuestionDefs(session.clinicId, "toc"),
    getCustomAnswersByRecord(records.map((r) => r.id)),
  ]);

  return (
    <div>
      <PageHeader
        title="Transition of Care (TOC)"
        description={`${member.firstName} ${member.lastName}`}
        backHref={`/members/${id}`}
        action={<PrintButton label="Print This TOC" memberId={id} resource="TocRecord" />}
      />
      <TocForm
        memberId={id}
        records={records}
        currentUserIsAdmin={currentUserIsAdmin}
        defaultVersionId={version}
        fields={fields}
        customQuestionDefs={customQuestionDefs}
        customAnswersByRecord={customAnswersByRecord}
      />
    </div>
  );
}
