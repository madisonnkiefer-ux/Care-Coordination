"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession, requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { generateTotpSecret, verifyTotpCode, generateBackupCodes, hashBackupCodes } from "@/lib/mfa";

export async function startMfaEnrollment() {
  const session = await verifySession();
  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { email: true, mfaEnabled: true } });
  if (user.mfaEnabled) return;

  const { secretBase32 } = generateTotpSecret(user.email);
  await db.user.update({ where: { id: session.userId }, data: { mfaSecret: secretBase32 } });
  revalidatePath("/account");
}

export async function cancelMfaEnrollment() {
  const session = await verifySession();
  await db.user.updateMany({
    where: { id: session.userId, mfaEnabled: false },
    data: { mfaSecret: null },
  });
  revalidatePath("/account");
}

export type ConfirmMfaState = { error?: string; backupCodes?: string[] } | undefined;

export async function confirmMfaEnrollment(_state: ConfirmMfaState, formData: FormData): Promise<ConfirmMfaState> {
  const session = await verifySession();
  const code = String(formData.get("code") ?? "").trim();

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { email: true, mfaEnabled: true, mfaSecret: true },
  });

  if (user.mfaEnabled || !user.mfaSecret) {
    return { error: "Start MFA setup again." };
  }
  if (!code || !verifyTotpCode(user.mfaSecret, user.email, code)) {
    return { error: "Invalid code. Check your authenticator app and try again." };
  }

  const backupCodes = generateBackupCodes();
  const hashes = await hashBackupCodes(backupCodes);
  await db.user.update({
    where: { id: session.userId },
    data: { mfaEnabled: true, mfaBackupCodeHashes: hashes },
  });
  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: session.userId,
    metadata: { mfaEnabled: true },
  });
  // No revalidatePath here deliberately: the client shows the returned
  // backupCodes from PendingView's own state, and a same-transition
  // revalidation would flip the parent's `mfa` prop to "enabled" and
  // unmount PendingView before that state ever rendered. The page is
  // refreshed instead once the user dismisses the reveal (see
  // MfaSettings' onDone -> router.refresh()).

  return { backupCodes };
}

export type DisableMfaState = { error?: string } | undefined;

export async function disableMfa(_state: DisableMfaState, formData: FormData): Promise<DisableMfaState> {
  const session = await verifySession();
  const password = String(formData.get("password") ?? "");

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { passwordHash: true, mfaEnabled: true },
  });
  if (!user.mfaEnabled) return;

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    return { error: "Incorrect password." };
  }

  await db.user.update({
    where: { id: session.userId },
    data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodeHashes: [] },
  });
  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: session.userId,
    metadata: { mfaEnabled: false },
  });
  revalidatePath("/account");
}

// Lost-device recovery: an admin clears a user's MFA entirely (they land
// back on password-only login and can re-enroll from /account), since
// there's no way to verify a lost device's original secret.
export async function adminResetMfa(userId: string) {
  const session = await requireRole("ADMIN");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");
  if (!target.mfaEnabled && !target.mfaSecret) return;

  await db.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodeHashes: [] },
  });
  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { mfaReset: true },
  });
  revalidatePath("/settings");
}
