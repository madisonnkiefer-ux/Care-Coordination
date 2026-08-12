"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/dal";

const LoginSchema = z.object({
  email: z.email({ error: "Enter a valid email." }),
  password: z.string().min(1, { error: "Password is required." }),
  officeCode: z.string().min(1, { error: "Office code is required." }),
});

export type LoginState = { error?: string } | undefined;

// Brute-force protection. The lockout is time-based (no admin unlock step)
// and always surfaces the same generic error as a wrong password — telling
// a caller "this account is locked" would confirm the email exists.
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;
const GENERIC_LOGIN_ERROR = "Invalid email, password, or office code.";

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

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await writeAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      resource: "User",
      resourceId: user.id,
      metadata: { email, ipAddress, reason: "locked_out" },
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const recordFailure = async (reason: string) => {
    // A lockout that has already expired starts this attempt's count fresh
    // instead of continuing to build on the stale pre-lockout count.
    const attempts = (user.lockedUntil ? 0 : user.failedLoginAttempts) + 1;
    const lockingOut = attempts >= LOCKOUT_THRESHOLD;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lockingOut ? 0 : attempts,
        lockedUntil: lockingOut ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
      },
    });
    await writeAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      resource: "User",
      resourceId: user.id,
      metadata: { email, ipAddress, reason, lockedOut: lockingOut },
    });
  };

  if (user.clinic.code.toUpperCase() !== officeCode.trim().toUpperCase()) {
    await recordFailure("office_code_mismatch");
    return { error: GENERIC_LOGIN_ERROR };
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    await recordFailure("bad_password");
    return { error: GENERIC_LOGIN_ERROR };
  }

  await createSession(user);
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
  });
  await writeAuditLog({
    userId: user.id,
    action: "LOGIN",
    resource: "User",
    resourceId: user.id,
    metadata: { ipAddress },
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
