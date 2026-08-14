"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  createSession,
  deleteSession,
  createMfaPendingCookie,
  readMfaPendingUserId,
  clearMfaPendingCookie,
} from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/dal";
import { isLockedOut, recordLoginFailure, recordLoginSuccess, GENERIC_LOGIN_ERROR } from "@/lib/auth-lockout";
import { verifyTotpCode, consumeBackupCode } from "@/lib/mfa";

const LoginSchema = z.object({
  email: z.email({ error: "Enter a valid email." }),
  password: z.string().min(1, { error: "Password is required." }),
  officeCode: z.string().min(1, { error: "Office code is required." }),
});

export type LoginState = { error?: string; mfaRequired?: boolean } | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    officeCode: formData.get("officeCode"),
  });

  if (!validated.success) {
    return { error: "Enter a valid email, password, and office code." };
  }

  const { email, password, officeCode } = validated.data;
  const ipAddress = (await headers()).get("x-forwarded-for") ?? undefined;

  const user = await db.user.findUnique({ where: { email }, include: { clinic: true } });

  if (!user || !user.active) {
    await writeAuditLog({
      userId: null,
      action: "LOGIN_FAILED",
      resource: "User",
      metadata: { email, ipAddress, reason: "no_such_user_or_inactive" },
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (isLockedOut(user)) {
    await writeAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      resource: "User",
      resourceId: user.id,
      metadata: { email, ipAddress, reason: "locked_out" },
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (user.clinic.code.toUpperCase() !== officeCode.trim().toUpperCase()) {
    await recordLoginFailure(user, "office_code_mismatch", { email, ipAddress });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    await recordLoginFailure(user, "bad_password", { email, ipAddress });
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (user.mfaEnabled) {
    await createMfaPendingCookie(user.id);
    await writeAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      resource: "User",
      resourceId: user.id,
      metadata: { email, ipAddress, reason: "mfa_required" },
    });
    return { mfaRequired: true };
  }

  await createSession(user);
  await recordLoginSuccess(user.id);
  await writeAuditLog({
    userId: user.id,
    action: "LOGIN",
    resource: "User",
    resourceId: user.id,
    metadata: { ipAddress },
  });

  redirect("/");
}

export type MfaVerifyState = { error?: string } | undefined;

export async function verifyMfaCode(_state: MfaVerifyState, formData: FormData): Promise<MfaVerifyState> {
  const code = String(formData.get("code") ?? "").trim();
  const ipAddress = (await headers()).get("x-forwarded-for") ?? undefined;

  const userId = await readMfaPendingUserId();
  if (!userId) {
    return { error: "Your session expired. Please sign in again." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.active || !user.mfaEnabled || !user.mfaSecret) {
    await clearMfaPendingCookie();
    return { error: "Your session expired. Please sign in again." };
  }

  if (isLockedOut(user)) {
    await clearMfaPendingCookie();
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (!code) {
    return { error: "Enter the 6-digit code from your authenticator app, or a backup code." };
  }

  const totpValid = verifyTotpCode(user.mfaSecret, user.email, code);
  let usedBackupCode = false;

  if (!totpValid) {
    const { matched, remainingHashes } = await consumeBackupCode(user.mfaBackupCodeHashes, code);
    if (!matched) {
      await recordLoginFailure(user, "mfa_invalid_code", { email: user.email, ipAddress });
      return { error: "Invalid code. Please try again." };
    }
    usedBackupCode = true;
    await db.user.update({ where: { id: user.id }, data: { mfaBackupCodeHashes: remainingHashes } });
  }

  await createSession(user);
  await recordLoginSuccess(user.id);
  await clearMfaPendingCookie();
  await writeAuditLog({
    userId: user.id,
    action: "LOGIN",
    resource: "User",
    resourceId: user.id,
    metadata: { ipAddress, mfa: true, usedBackupCode },
  });

  redirect("/");
}

export async function logout() {
  const session = await getSession();
  await deleteSession();
  if (session) {
    await writeAuditLog({
      userId: session.userId,
      action: "LOGOUT",
      resource: "User",
      resourceId: session.userId,
    });
  }
  redirect("/login");
}

// Keeps the idle-timeout window sliding forward while the user is genuinely
// active but hasn't navigated. Next.js's client Router Cache serves repeat
// visits to already-loaded pages straight from the client without a network
// request, so clicking around normally can go long stretches without ever
// reaching proxy.ts (the actual place the session cookie gets refreshed).
// Server Actions are POSTs that always hit the server — never served from
// that cache — so this is a reliable way to keep the session alive.
// Does nothing itself; the refresh happens in proxy.ts on this request.
export async function heartbeat() {
  await getSession();
}
