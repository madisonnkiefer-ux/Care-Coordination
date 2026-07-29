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
    return { error: "Invalid email, password, or office code." };
  }

  if (user.clinic.code.toUpperCase() !== officeCode.trim().toUpperCase()) {
    await writeAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      resource: "User",
      resourceId: user.id,
      metadata: { email, ipAddress, reason: "office_code_mismatch" },
    });
    return { error: "Invalid email, password, or office code." };
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    await writeAuditLog({
      userId: user.id,
      action: "LOGIN_FAILED",
      resource: "User",
      resourceId: user.id,
      metadata: { email, ipAddress },
    });
    return { error: "Invalid email, password, or office code." };
  }

  await createSession(user);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
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
