import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionPayload, type SessionPayload } from "@/lib/session";
import type { Role } from "@/app/generated/prisma/client";

// Central auth/authorization checkpoint. Every page, layout, server action,
// and route handler that touches PHI should call this (or requireRole)
// rather than trusting a page-level check higher up the tree — see Next.js
// data security guidance: Server Actions and Route Handlers are independent
// entry points and must each re-verify the caller.
//
// This only reads the session (Server Components can't write cookies).
// Sliding the idle-timeout window forward on activity happens in proxy.ts,
// which runs on every request and is allowed to write response cookies.
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSessionPayload();
  if (!session) {
    redirect("/login");
  }
  return session;
});

// Optional variant that doesn't redirect — use in places (proxy, API
// endpoints returning 401 JSON) where a redirect isn't the right response.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  return getSessionPayload();
});

export async function requireRole(...roles: Role[]) {
  const session = await verifySession();
  if (!roles.includes(session.role)) {
    redirect("/");
  }
  return session;
}

// Authorization (not just authentication): confirms the caller may access
// this specific member record — same clinic always, and for care
// coordinators, only members assigned to them (minimum-necessary access).
export async function authorizeMemberAccess(memberId: string) {
  const session = await verifySession();
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { assignedCoordinator: { select: { id: true, name: true } } },
  });

  if (!member || member.clinicId !== session.clinicId) {
    return { session, member: null };
  }
  if (
    session.role === "CARE_COORDINATOR" &&
    member.assignedCoordinatorId !== session.userId
  ) {
    return { session, member: null };
  }
  return { session, member };
}

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  return db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, clinicId: true },
  });
});
