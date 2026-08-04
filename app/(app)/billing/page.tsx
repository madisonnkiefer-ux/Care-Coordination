import { getBillingRoster } from "@/lib/data/billing";
import { PageHeader } from "@/components/ui";
import { BillingClient } from "@/components/billing/billing-client";

export default async function BillingPage() {
  const data = await getBillingRoster();

  return (
    <div>
      <PageHeader title="Billing" description="Monthly billing roster across all members, exportable to Excel" />
      <div className="p-8">
        <BillingClient {...data} />
      </div>
    </div>
  );
}
