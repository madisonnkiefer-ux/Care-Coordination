import { getPatientSnapshot } from "@/lib/data/patient-snapshot";
import { PatientSnapshotPanel } from "@/components/patient-snapshot-panel";

export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snapshot = await getPatientSnapshot(id);

  return (
    <div className="flex">
      <div className="min-w-0 flex-1">{children}</div>
      {snapshot && <PatientSnapshotPanel snapshot={snapshot} />}
    </div>
  );
}
