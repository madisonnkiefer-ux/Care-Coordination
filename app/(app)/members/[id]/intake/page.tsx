import { notFound } from "next/navigation";
import { getDemographicsFormData } from "@/lib/data/demographics";
import { getHraFormData } from "@/lib/data/hra";
import { getCnaFormData } from "@/lib/data/cna";
import { getCareCoordinationNoteFormData } from "@/lib/data/care-coordination-notes";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { DemographicsTab } from "@/components/intake/demographics-tab";
import { HraTab } from "@/components/intake/hra-tab";
import { CnaTab } from "@/components/intake/cna-tab";
import { CareCoordinationNotesTab } from "@/components/intake/care-coordination-notes-tab";

export default async function IntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  const [demographicsData, hraData, cnaData, notesData, currentUser] = await Promise.all([
    getDemographicsFormData(id),
    getHraFormData(id),
    getCnaFormData(id),
    getCareCoordinationNoteFormData(id),
    getCurrentUser(),
  ]);

  if (!demographicsData || !hraData || !cnaData || !notesData) notFound();

  const { member } = demographicsData;
  const currentUserIsAdmin = currentUser?.role === "ADMIN";

  return (
    <div>
      <PageHeader title="Intake" description={`${member.firstName} ${member.lastName}`} />
      <Tabs
        defaultTabId={tab}
        tabs={[
          {
            id: "demographics",
            label: "Demographics",
            content: <DemographicsTab memberId={id} records={demographicsData.records} currentUserIsAdmin={currentUserIsAdmin} />,
          },
          { id: "hra", label: "HRA", content: <HraTab memberId={id} records={hraData.records} currentUserIsAdmin={currentUserIsAdmin} /> },
          { id: "cna", label: "CNA", content: <CnaTab memberId={id} records={cnaData.records} currentUserIsAdmin={currentUserIsAdmin} /> },
          {
            id: "notes",
            label: "Care Coordination Notes",
            content: <CareCoordinationNotesTab memberId={id} records={notesData.records} currentUserIsAdmin={currentUserIsAdmin} />,
          },
        ]}
      />
    </div>
  );
}
