"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { saveCustomAnswers } from "@/lib/custom-questions-save";
import { assertNotStale } from "@/lib/concurrency";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function date(formData: FormData, key: string) {
  const v = str(formData, key);
  return v ? new Date(v) : null;
}

// Flags the member the moment they cross 3 consecutive unsuccessful
// attempts — fires once at the threshold, not again on every attempt
// after, so it stays a signal rather than noise.
async function notifyIfUnsuccessfulStreak(
  memberId: string,
  member: { assignedCoordinatorId: string | null; firstName: string; lastName: string },
  session: { clinicId: string; userId: string }
) {
  const recent = await db.generalCommunication.findMany({
    where: { memberId, successful: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { successful: true },
  });
  let streak = 0;
  for (const c of recent) {
    if (c.successful === false) streak++;
    else break;
  }
  if (streak === 3 && member.assignedCoordinatorId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: member.assignedCoordinatorId,
      actorId: session.userId,
      priority: "HIGH",
      title: `${member.firstName} ${member.lastName} has reached 3 unsuccessful contact attempts in a row`,
      memberId,
    });
  }
}

// The fast path: one textarea and a Save button, no separate "create a
// blank entry, then fill it in" round trip. The outreach-detail fields
// (contact method, successful, etc.) are optional here — tucked into a
// collapsed disclosure in the UI — but still land on the same record and
// still feed touchpoint compliance when a coordinator does fill them in.
export async function createGeneralCommunicationEntry(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const successfulRaw = formData.get("successful");
  const successful = successfulRaw === "yes" ? true : successfulRaw === "no" ? false : null;
  const contactDate = date(formData, "contactDate");

  const record = await db.generalCommunication.create({
    data: {
      memberId,
      authorId: session.userId,
      body: str(formData, "body"),
      contactMethod: str(formData, "contactMethod"),
      successful,
      unsuccessfulReason: successful === false ? str(formData, "unsuccessfulReason") : null,
      personContacted: str(formData, "personContacted"),
      nextAttemptDate: date(formData, "nextAttemptDate"),
      ...(contactDate ? { createdAt: contactDate } : {}),
    },
  });

  await saveCustomAnswers(member.clinicId, "generalComm", record.id, formData);

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "GeneralCommunication",
    resourceId: record.id,
  });

  if (successful === false) await notifyIfUnsuccessfulStreak(memberId, member, session);

  revalidatePath(`/members/${memberId}/care-plan`);
  revalidatePath("/members");
}

export async function saveGeneralCommunication(memberId: string, commId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.generalCommunication.findUnique({ where: { id: commId } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");
  assertNotStale(formData, existing.updatedAt);

  const successfulRaw = formData.get("successful");
  const successful = successfulRaw === "yes" ? true : successfulRaw === "no" ? false : null;

  // Defaults to "when this was logged" (createdAt's own @default(now())),
  // but coordinators regularly catch up on documentation after the fact —
  // this lets the record's date reflect when the contact actually
  // happened instead of when it was typed in. Blank/unparseable means "no
  // change" (createdAt is required, not nullable), matching every other
  // required-date field's handling elsewhere in this app.
  const contactDate = date(formData, "contactDate");

  await db.generalCommunication.update({
    where: { id: commId },
    data: {
      body: str(formData, "body"),
      contactMethod: str(formData, "contactMethod"),
      successful,
      unsuccessfulReason: successful === false ? str(formData, "unsuccessfulReason") : null,
      personContacted: str(formData, "personContacted"),
      nextAttemptDate: date(formData, "nextAttemptDate"),
      ...(contactDate ? { createdAt: contactDate } : {}),
    },
  });

  await saveCustomAnswers(member.clinicId, "generalComm", commId, formData);

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "GeneralCommunication",
    resourceId: commId,
    ...(contactDate && contactDate.getTime() !== existing.createdAt.getTime()
      ? { metadata: { contactDateChanged: true, oldValue: existing.createdAt.toISOString(), newValue: contactDate.toISOString() } }
      : {}),
  });

  if (successful === false) await notifyIfUnsuccessfulStreak(memberId, member, session);

  revalidatePath(`/members/${memberId}/care-plan`);
  revalidatePath("/members");
}
