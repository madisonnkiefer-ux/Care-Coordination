import { getAccountSecuritySettings } from "@/lib/data/account";
import { PageHeader } from "@/components/ui";
import { MfaSettings } from "@/components/account/mfa-settings";

export default async function AccountPage() {
  const mfa = await getAccountSecuritySettings();

  return (
    <div>
      <PageHeader title="Account & Security" description="Manage your own sign-in security." />
      <div className="p-8 max-w-xl">
        <MfaSettings mfa={mfa} />
      </div>
    </div>
  );
}
