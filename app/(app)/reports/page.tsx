import { getReportsData } from "@/lib/data/reports";
import { PageHeader } from "@/components/ui";
import { ReportsClient } from "@/components/reports/reports-client";

export default async function ReportsPage() {
  const data = await getReportsData();

  return (
    <div>
      <PageHeader title="Reports" description="Clinic-wide reporting across your caseload" />
      <div className="p-8">
        <ReportsClient {...data} />
      </div>
    </div>
  );
}
