import { notFound } from "next/navigation";
import { getCarePlanFormData } from "@/lib/data/care-plan";
import { getGeneralCommunicationFormData } from "@/lib/data/general-communication";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { CcpTab } from "@/components/care-plan/ccp-tab";
import { HedisTab } from "@/components/care-plan/hedis-tab";
import { GeneralCommunicationTab } from "@/components/care-plan/general-communication-tab";

export default async function CarePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [carePlanData, commData] = await Promise.all([getCarePlanFormData(id), getGeneralCommunicationFormData(id)]);

  if (!carePlanData || !commData) notFound();

  const { member, records: carePlans } = carePlanData;

  return (
    <div>
      <PageHeader title="Care Plan" description={`${member.firstName} ${member.lastName}`} />
      <Tabs
        tabs={[
          { id: "ccp", label: "CCP", content: <CcpTab memberId={id} records={carePlans} /> },
          { id: "hedis", label: "HEDIS Measures", content: <HedisTab /> },
          {
            id: "general-communication",
            label: "General Communication",
            content: <GeneralCommunicationTab memberId={id} records={commData.records} />,
          },
        ]}
      />
    </div>
  );
}
