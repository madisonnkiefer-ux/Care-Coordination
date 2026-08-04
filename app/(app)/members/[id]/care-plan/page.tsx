import { notFound } from "next/navigation";
import { getCarePlanFormData } from "@/lib/data/care-plan";
import { getGeneralCommunicationFormData } from "@/lib/data/general-communication";
import { getHedisFormData } from "@/lib/data/hedis";
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

  const [carePlanData, commData, hedisData] = await Promise.all([
    getCarePlanFormData(id),
    getGeneralCommunicationFormData(id),
    getHedisFormData(id),
  ]);

  if (!carePlanData || !commData || !hedisData) notFound();

  const { member, records: carePlans } = carePlanData;

  return (
    <div>
      <PageHeader
        title="Care Plan"
        description={`${member.firstName} ${member.lastName}`}
        action={<PrintButton label="Print This Form" />}
      />
      <Tabs
        defaultTabId={tab}
        tabs={[
          { id: "ccp", label: "CCP", content: <CcpTab memberId={id} records={carePlans} defaultVersionId={version} /> },
          { id: "hedis", label: "HEDIS Measures", content: <HedisTab memberId={id} record={hedisData.record} /> },
          {
            id: "general-communication",
            label: "General Communication",
            content: <GeneralCommunicationTab memberId={id} records={commData.records} program={member.program} />,
          },
        ]}
      />
    </div>
  );
}
