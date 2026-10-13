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

// HTML date inputs only carry a Y/M/D, with no time-of-day. The edit
// form's date field is pre-filled with the note's existing date so a
// save that doesn't touch it round-trips cleanly — but applying that
// value naively (as plain UTC midnight) would silently truncate the
// note's actual logged time on every edit, which scrambles same-day
// ordering (and which note "Delete" on the top of the list actually
// hits). Keep the original time-of-day unless the date itself changed.
function mergeDateKeepingTime(datePart: Date, timeSource: Date): Date {
  const merged = new Date(timeSource);
  merged.setUTCFullYear(datePart.getUTCFullYear(), datePart.getUTCMonth(), datePart.getUTCDate());
  return merged;
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

export async function deleteGeneralCommunicationEntry(memberId: string, commId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.generalCommunication.findUnique({ where: { id: commId } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");

  await db.generalCommunication.delete({ where: { id: commId } });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "DELETE",
    resource: "GeneralCommunication",
    resourceId: commId,
    metadata: { deletedBody: existing.body },
  });

  revalidatePath(`/members/${memberId}/care-plan`);
  revalidatePath("/members");
}

export async function saveGeneralCommunication(memberId: string, commId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.generalCommunication.findUnique({ where: { id: commId } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");
  assertNotStale(formData, existing.updatedAt);

  // The simplified note form no longer surfaces the old structured
  // outreach-attempt fields (contact method, successful/unsuccessful,
  // etc.) — only present on older records. Leave them exactly as they
  // were rather than nulling them out just because this save didn't
  // include inputs for them.
  const hasSuccessfulField = formData.has("successful");
  const successfulRaw = formData.get("successful");
  const successful = hasSuccessfulField ? (successfulRaw === "yes" ? true : successfulRaw === "no" ? false : null) : existing.successful;

  // Defaults to "when this was logged" (createdAt's own @default(now())),
  // but coordinators regularly catch up on documentation after the fact —
  // this lets the record's date reflect when the contact actually
  // happened instead of when it was typed in. Blank/unparseable means "no
  // change" (createdAt is required, not nullable), matching every other
  // required-date field's handling elsewhere in this app. The date-only
  // input is merged onto the existing time-of-day (see
  // mergeDateKeepingTime) so re-saving without touching this field is a
  // true no-op instead of silently resetting the logged time to midnight.
  const contactDate = date(formData, "contactDate");
  const newCreatedAt = contactDate ? mergeDateKeepingTime(contactDate, existing.createdAt) : null;

  await db.generalCommunication.update({
    where: { id: commId },
    data: {
      body: str(formData, "body"),
      contactMethod: formData.has("contactMethod") ? str(formData, "contactMethod") : existing.contactMethod,
      successful,
      unsuccessfulReason: hasSuccessfulField
        ? successful === false
          ? str(formData, "unsuccessfulReason")
          : null
        : existing.unsuccessfulReason,
      personContacted: formData.has("personContacted") ? str(formData, "personContacted") : existing.personContacted,
      nextAttemptDate: formData.has("nextAttemptDate") ? date(formData, "nextAttemptDate") : existing.nextAttemptDate,
      ...(newCreatedAt ? { createdAt: newCreatedAt } : {}),
    },
  });

  await saveCustomAnswers(member.clinicId, "generalComm", commId, formData);

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "GeneralCommunication",
    resourceId: commId,
    ...(newCreatedAt && newCreatedAt.getTime() !== existing.createdAt.getTime()
      ? { metadata: { contactDateChanged: true, oldValue: existing.createdAt.toISOString(), newValue: newCreatedAt.toISOString() } }
      : {}),
  });

  if (successful === false) await notifyIfUnsuccessfulStreak(memberId, member, session);

  revalidatePath(`/members/${memberId}/care-plan`);
  revalidatePath("/members");
}
