"use client";

import { useActionState, useState, useTransition } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui";
import {
  startMfaEnrollment,
  cancelMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  type DisableMfaState,
} from "@/app/actions/mfa";
import type { getAccountSecuritySettings } from "@/lib/data/account";

type Mfa = Awaited<ReturnType<typeof getAccountSecuritySettings>>;

export function MfaSettings({ mfa }: { mfa: Mfa }) {
  // Any server action invoked from a bound <form> triggers an automatic
  // Next.js refresh of this route's Server Component props once it
  // completes — including confirmMfaEnrollment, which would otherwise flip
  // `mfa` to "enabled" and unmount whatever was showing the plaintext
  // backup codes before the user ever saw them. Owning that reveal here,
  // one level up, means it survives that refresh: this component doesn't
  // unmount on a prop change, only its children do.
  const [revealedCodes, setRevealedCodes] = useState<string[] | null>(null);

  if (revealedCodes) {
    return <BackupCodesReveal codes={revealedCodes} onDone={() => setRevealedCodes(null)} />;
  }
  if (mfa.status === "enabled") return <EnabledView backupCodesRemaining={mfa.backupCodesRemaining} />;
  if (mfa.status === "pending") {
    return <PendingView secretBase32={mfa.secretBase32} qrSvg={mfa.qrSvg} onEnrolled={setRevealedCodes} />;
  }
  return <DisabledView />;
}

function DisabledView() {
  return (
    <Card title="Two-Factor Authentication">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-stone-400" />
        <div className="flex-1">
          <p className="text-sm text-stone-600">
            Add a second step at sign-in using an authenticator app (e.g. Google Authenticator, Authy, 1Password).
          </p>
          <form action={startMfaEnrollment} className="mt-3">
            <button
              type="submit"
              className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
            >
              Set Up Two-Factor Authentication
            </button>
          </form>
        </div>
      </div>
    </Card>
  );
}

function PendingView({
  secretBase32,
  qrSvg,
  onEnrolled,
}: {
  secretBase32: string;
  qrSvg: string;
  onEnrolled: (codes: string[]) => void;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // Called directly (not via a <form action> bound to useActionState) and
  // awaited here so the result lands in this handler's own continuation —
  // see the note in MfaSettings on why that matters.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await confirmMfaEnrollment(undefined, formData);
      if (result?.backupCodes) {
        onEnrolled(result.backupCodes);
      } else {
        setError(result?.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  const formattedKey = secretBase32.match(/.{1,4}/g)?.join(" ") ?? secretBase32;

  return (
    <Card title="Set Up Two-Factor Authentication">
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          Scan this code with your authenticator app, then enter the 6-digit code it shows.
        </p>
        <div
          className="h-48 w-48 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Can&apos;t scan? Enter manually</p>
          <p className="mt-1 font-mono text-sm text-stone-700">{formattedKey}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="code" className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
              6-digit code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {pending ? "Verifying..." : "Confirm"}
          </button>
        </form>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <form action={cancelMfaEnrollment}>
          <button type="submit" className="text-xs text-stone-400 hover:text-stone-600">
            Cancel setup
          </button>
        </form>
      </div>
    </Card>
  );
}

function BackupCodesReveal({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  return (
    <Card title="Save Your Backup Codes">
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          Two-factor authentication is now on. Each of these codes can be used once to sign in if you lose access to
          your authenticator app. Save them somewhere safe — they won&apos;t be shown again.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-sm">
          {codes.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          I&apos;ve saved these codes
        </button>
      </div>
    </Card>
  );
}

function EnabledView({ backupCodesRemaining }: { backupCodesRemaining: number }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<DisableMfaState, FormData>(disableMfa, undefined);

  return (
    <Card title="Two-Factor Authentication">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-charcoal">Enabled</p>
          <p className="text-sm text-stone-600">
            {backupCodesRemaining} backup {backupCodesRemaining === 1 ? "code" : "codes"} remaining.
          </p>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-2 text-xs font-medium text-stone-500 hover:text-charcoal hover:underline"
            >
              Disable two-factor authentication
            </button>
          ) : (
            <form action={formAction} className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="password" className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Confirm your password to disable
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {pending ? "Disabling..." : "Disable"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                Cancel
              </button>
            </form>
          )}
          {state?.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
