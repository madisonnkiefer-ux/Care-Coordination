import { notFound } from "next/navigation";
import { getIntakeFormData } from "@/lib/data/intake";
import { getCurrentUser, verifySession } from "@/lib/dal";
import { getFormFieldOverrides, getResolvedFieldOrder } from "@/lib/data/form-fields";
import { DEMOGRAPHICS_FIELD_KEYS } from "@/lib/form-fields/registry";
import { getActiveCustomQuestionDefs, getCustomAnswersByRecord } from "@/lib/data/custom-questions";
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

  const session = await verifySession();
  const [intakeData, currentUser, fields, demographicsFieldOrder] = await Promise.all([
    getIntakeFormData(id),
    getCurrentUser(),
    getFormFieldOverrides(session.clinicId),
    getResolvedFieldOrder(session.clinicId, "demographics", DEMOGRAPHICS_FIELD_KEYS),
  ]);

  if (!intakeData) notFound();

  const { member, versions } = intakeData;
  const currentUserIsAdmin = currentUser?.role === "ADMIN";

  const recordIds = versions.flatMap((v) => [v.demographics?.id, v.hra?.id, v.cna?.id, v.note?.id].filter((x): x is string => Boolean(x)));
  const [customDemographics, customHra, customCna, customCcn, customAnswersByRecord] = await Promise.all([
    getActiveCustomQuestionDefs(session.clinicId, "demographics"),
    getActiveCustomQuestionDefs(session.clinicId, "hra"),
    getActiveCustomQuestionDefs(session.clinicId, "cna"),
    getActiveCustomQuestionDefs(session.clinicId, "ccn"),
    getCustomAnswersByRecord(recordIds),
  ]);
  const customQuestions = { demographics: customDemographics, hra: customHra, cna: customCna, ccn: customCcn };

  return (
    <div>
      <PageHeader
        title="Enrollment"
        description={`${member.firstName} ${member.lastName}`}
        backHref={`/members/${id}`}
        action={<PrintButton label="Print This Form" />}
      />
      <IntakeShell
        memberId={id}
        versions={versions}
        currentUserIsAdmin={currentUserIsAdmin}
        defaultSubTab={tab}
        defaultVersionId={version}
        fields={fields}
        demographicsFieldOrder={demographicsFieldOrder}
        customQuestions={customQuestions}
        customAnswersByRecord={customAnswersByRecord}
      />
    </div>
  );
}
