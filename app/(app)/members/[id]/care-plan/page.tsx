import { notFound } from "next/navigation";
import { getCarePlanFormData } from "@/lib/data/care-plan";
import { getGeneralCommunicationFormData } from "@/lib/data/general-communication";
import { getHedisFormData } from "@/lib/data/hedis";
import { getCurrentUser, verifySession } from "@/lib/dal";
import { getFormFieldOverrides } from "@/lib/data/form-fields";
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
  const [carePlanData, commData, hedisData, currentUser, fields] = await Promise.all([
    getCarePlanFormData(id),
    getGeneralCommunicationFormData(id),
    getHedisFormData(id),
    getCurrentUser(),
    getFormFieldOverrides(session.clinicId),
  ]);

  if (!carePlanData || !commData || !hedisData) notFound();

  const { member, records: carePlans } = carePlanData;
  const currentUserIsAdmin = currentUser?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Care Plan"
        description={`${member.firstName} ${member.lastName}`}
        backHref={`/members/${id}`}
        action={<PrintButton label="Print This Form" />}
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
                currentUserIsAdmin={currentUserIsAdmin}
                fields={fields}
              />
            ),
          },
          { id: "hedis", label: "HEDIS Measures", content: <HedisTab memberId={id} record={hedisData.record} /> },
          {
            id: "general-communication",
            label: "General Communication",
            content: (
              <GeneralCommunicationTab memberId={id} records={commData.records} program={member.program} fields={fields} />
            ),
          },
        ]}
      />
    </div>
  );
}
