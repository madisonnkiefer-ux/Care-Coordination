import "server-only";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { totpUrlForSecret } from "@/lib/mfa";

// Recomputes the same otpauth:// URI (and QR) across re-renders of a
// pending enrollment from the already-persisted secret, so refreshing the
// page mid-enrollment doesn't invalidate a code the user already scanned.
async function pendingEnrollmentView(secretBase32: string, email: string) {
  const otpauthUrl = totpUrlForSecret(secretBase32, email);
  const qrSvg = await QRCode.toString(otpauthUrl, { type: "svg", margin: 1 });
  return { secretBase32, qrSvg };
}

export async function getAccountSecuritySettings() {
  const session = await verifySession();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { email: true, mfaEnabled: true, mfaSecret: true, mfaBackupCodeHashes: true },
  });

  if (user.mfaEnabled) {
    return {
      status: "enabled" as const,
      backupCodesRemaining: user.mfaBackupCodeHashes.length,
    };
  }

  if (user.mfaSecret) {
    const { secretBase32, qrSvg } = await pendingEnrollmentView(user.mfaSecret, user.email);
    return { status: "pending" as const, secretBase32, qrSvg };
  }

  return { status: "disabled" as const };
}
