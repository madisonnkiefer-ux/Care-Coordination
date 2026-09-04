import { notFound } from "next/navigation";
import { getCarePlanFormData } from "@/lib/data/care-plan";
import { getGeneralCommunicationFormData } from "@/lib/data/general-communication";
import { getHedisFormData } from "@/lib/data/hedis";
import { verifySession } from "@/lib/dal";
import { getFormFieldOverrides, getResolvedFieldOrder } from "@/lib/data/form-fields";
import { CCP_FIELD_KEYS } from "@/lib/form-fields/registry";
import { getActiveCustomQuestionDefs, getCustomAnswersByRecord } from "@/lib/data/custom-questions";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { CcpTab } from "@/components/care-plan/ccp-tab";
import { HedisTab } from "@/components/care-plan/hedis-tab";
import { GeneralCommunicationTab } from "@/components/care-plan/general-communication-tab";
import { PrintButton } from "@/components/print-button";

export default async function CarePlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; version?: string }>;
}) {
  const { id } = await params;
  const { tab, version } = await searchParams;

  const session = await verifySession();
  const [carePlanData, commData, hedisData, fields, fieldOrder] = await Promise.all([
    getCarePlanFormData(id),
    getGeneralCommunicationFormData(id),
    getHedisFormData(id),
    getFormFieldOverrides(session.clinicId),
    getResolvedFieldOrder(session.clinicId, "ccp", CCP_FIELD_KEYS),
  ]);

  if (!carePlanData || !commData || !hedisData) notFound();

  const { member, records: carePlans } = carePlanData;
  const canDelete = session.permissions.includes("DELETE_RECORDS");

  const [ccpQuestionDefs, generalCommQuestionDefs, ccpAnswers, generalCommAnswers] = await Promise.all([
    getActiveCustomQuestionDefs(session.clinicId, "ccp"),
    getActiveCustomQuestionDefs(session.clinicId, "generalComm"),
    getCustomAnswersByRecord(carePlans.map((p) => p.id)),
    getCustomAnswersByRecord(commData.records.map((r) => r.id)),
  ]);

  return (
    <div>
      <PageHeader
        title="Care Plan"
        description={`${member.firstName} ${member.lastName}`}
        backHref={`/members/${id}`}
        action={<PrintButton label="Print This Form" memberId={id} resource="CarePlan" />}
      />
      <Tabs
        defaultTabId={tab}
        tabs={[
          {
            id: "ccp",
            label: "CCP",
            content: (
              <CcpTab
                memberId={id}
                records={carePlans}
                defaultVersionId={version}
                currentUserIsAdmin={canDelete}
                fields={fields}
                fieldOrder={fieldOrder}
                customQuestionDefs={ccpQuestionDefs}
                customAnswersByRecord={ccpAnswers}
              />
            ),
          },
          { id: "hedis", label: "HEDIS Measures", content: <HedisTab memberId={id} record={hedisData.record} /> },
          {
            id: "general-communication",
            label: "General Communication",
            content: (
              <GeneralCommunicationTab
                memberId={id}
                records={commData.records}
                program={member.program}
                enrollmentDate={commData.enrollmentDate}
                cadenceOverrides={commData.cadenceOverrides}
                fields={fields}
                fieldOrder={fieldOrder}
                customQuestionDefs={generalCommQuestionDefs}
                customAnswersByRecord={generalCommAnswers}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
