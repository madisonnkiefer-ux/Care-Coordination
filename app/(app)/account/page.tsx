import { getAccountSecuritySettings } from "@/lib/data/account";
import { PageHeader } from "@/components/ui";
import { MfaSettings } from "@/components/account/mfa-settings";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mfaRequired?: string }> }) {
  const [mfa, { mfaRequired }] = await Promise.all([getAccountSecuritySettings(), searchParams]);

  return (
    <div>
      <PageHeader title="Account & Security" description="Manage your own sign-in security." />
      <div className="p-8 max-w-xl">
        {mfaRequired && mfa.status !== "enabled" && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Two-factor authentication is required for your role. Set it up below before continuing.
          </div>
        )}
        <MfaSettings mfa={mfa} />
      </div>
    </div>
  );
}
