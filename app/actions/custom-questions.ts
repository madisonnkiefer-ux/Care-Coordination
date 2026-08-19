"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { CustomQuestionType } from "@/app/generated/prisma/client";

const QUESTION_TYPES: CustomQuestionType[] = ["TEXT", "TEXTAREA", "SELECT", "CHECKBOX_GROUP", "YES_NO", "DATE"];
const OPTIONS_TYPES: CustomQuestionType[] = ["SELECT", "CHECKBOX_GROUP"];

function parseOptions(formData: FormData): string[] {
  const raw = formData.get("options");
  if (typeof raw !== "string") return [];
  const seen = new Set<string>();
  const options: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      options.push(trimmed);
    }
  }
  return options;
}

export async function createCustomQuestion(form: string, formData: FormData) {
  const session = await requirePermission("MANAGE_FORM_CONTENT");

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("A question label is required.");

  const typeRaw = String(formData.get("type") ?? "");
  if (!QUESTION_TYPES.includes(typeRaw as CustomQuestionType)) throw new Error("Invalid question type.");
  const type = typeRaw as CustomQuestionType;

  let options: string[] | undefined;
  if (OPTIONS_TYPES.includes(type)) {
    options = parseOptions(formData);
    if (options.length === 0) throw new Error("At least one option is required for this question type.");
  }

  const sectionRaw = String(formData.get("section") ?? "").trim();

  // "Position" on the add-question form: which existing question (in this
  // form's list) the new one should be inserted directly after. Empty/unset
  // means "at the end" — the previous, only behavior.
  const afterQuestionId = String(formData.get("afterQuestionId") ?? "").trim() || null;

  const existing = await db.customQuestion.findMany({
    where: { clinicId: session.clinicId, form },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const question = await db.customQuestion.create({
    data: {
      clinicId: session.clinicId,
      form,
      section: sectionRaw || null,
      type,
      label,
      options,
      order: existing.length,
      createdById: session.userId,
    },
  });

  // Splice the new question into the desired position, then renumber
  // everyone in this form so `order` stays a dense, gap-free sequence.
  const orderedIds = existing.map((q) => q.id);
  const afterIndex = afterQuestionId ? orderedIds.indexOf(afterQuestionId) : -1;
  const insertAt = afterIndex === -1 ? orderedIds.length : afterIndex + 1;
  orderedIds.splice(insertAt, 0, question.id);

  await db.$transaction(orderedIds.map((id, index) => db.customQuestion.update({ where: { id }, data: { order: index } })));

  await writeAuditLog({ userId: session.userId, action: "CREATE", resource: "CustomQuestion", resourceId: question.id });

  revalidatePath("/settings");
}

export async function moveCustomQuestion(questionId: string, direction: "up" | "down") {
  const session = await requirePermission("MANAGE_FORM_CONTENT");
  const question = await db.customQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.clinicId !== session.clinicId) throw new Error("Not found.");

  const siblings = await db.customQuestion.findMany({
    where: { clinicId: session.clinicId, form: question.form },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const orderedIds = siblings.map((q) => q.id);
  const index = orderedIds.indexOf(questionId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= orderedIds.length) return;

  [orderedIds[index], orderedIds[swapWith]] = [orderedIds[swapWith], orderedIds[index]];

  await db.$transaction(orderedIds.map((id, i) => db.customQuestion.update({ where: { id }, data: { order: i } })));

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "CustomQuestion",
    resourceId: questionId,
    metadata: { moved: direction },
  });

  revalidatePath("/settings");
}

export async function deleteCustomQuestion(questionId: string) {
  const session = await requirePermission("MANAGE_FORM_CONTENT");
  const question = await db.customQuestion.findUnique({
    where: { id: questionId },
    include: { _count: { select: { answers: true } } },
  });
  if (!question || question.clinicId !== session.clinicId) throw new Error("Not found.");
  if (question._count.answers > 0) {
    throw new Error("This question already has answers on file — retire it instead of deleting it.");
  }

  await db.customQuestion.delete({ where: { id: questionId } });

  await writeAuditLog({ userId: session.userId, action: "DELETE", resource: "CustomQuestion", resourceId: questionId });

  revalidatePath("/settings");
}

export async function setCustomQuestionActive(questionId: string, active: boolean) {
  const session = await requirePermission("MANAGE_FORM_CONTENT");
  const question = await db.customQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.clinicId !== session.clinicId) throw new Error("Not found.");

  await db.customQuestion.update({ where: { id: questionId }, data: { active } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "CustomQuestion",
    resourceId: questionId,
    metadata: { active },
  });

  revalidatePath("/settings");
}
