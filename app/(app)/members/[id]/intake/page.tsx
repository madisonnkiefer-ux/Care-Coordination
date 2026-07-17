import { notFound } from "next/navigation";
import { getMemberForEdit } from "@/lib/data/members";
import { getHraFormData } from "@/lib/data/hra";
import { getCnaFormData } from "@/lib/data/cna";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/tabs";
import { DemographicsTab } from "@/components/intake/demographics-tab";
import { HraTab } from "@/components/intake/hra-tab";
import { CnaTab } from "@/components/intake/cna-tab";
import { NotesTab } from "@/components/intake/notes-tab";

export default async function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ member, demographics }, hraData, cnaData] = await Promise.all([
    getMemberForEdit(id),
    getHraFormData(id),
    getCnaFormData(id),
  ]);

  if (!hraData || !cnaData) notFound();

  return (
    <div>
      <PageHeader title="Intake" description={`${member.firstName} ${member.lastName}`} />
      <Tabs
        tabs={[
          { id: "demographics", label: "Demographics", content: <DemographicsTab memberId={id} member={member} demographics={demographics} /> },
          { id: "hra", label: "HRA", content: <HraTab memberId={id} data={hraData} /> },
          { id: "cna", label: "CNA", content: <CnaTab memberId={id} data={cnaData} /> },
          { id: "notes", label: "Care Coordination Notes", content: <NotesTab /> },
        ]}
      />
    </div>
  );
}
