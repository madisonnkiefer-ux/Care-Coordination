"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
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
  const session = await requireRole("ADMIN");

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

  const last = await db.customQuestion.findFirst({ where: { clinicId: session.clinicId, form }, orderBy: { order: "desc" } });

  const question = await db.customQuestion.create({
    data: {
      clinicId: session.clinicId,
      form,
      section: sectionRaw || null,
      type,
      label,
      options,
      order: (last?.order ?? 0) + 1,
      createdById: session.userId,
    },
  });

  await writeAuditLog({ userId: session.userId, action: "CREATE", resource: "CustomQuestion", resourceId: question.id });

  revalidatePath("/settings");
}

export async function updateCustomQuestion(questionId: string, formData: FormData) {
  const session = await requireRole("ADMIN");
  const question = await db.customQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.clinicId !== session.clinicId) throw new Error("Not found.");

  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("A question label is required.");

  let options: string[] | undefined;
  if (OPTIONS_TYPES.includes(question.type)) {
    options = parseOptions(formData);
    if (options.length === 0) throw new Error("At least one option is required for this question type.");
  }

  const sectionRaw = String(formData.get("section") ?? "").trim();

  await db.customQuestion.update({
    where: { id: questionId },
    data: { label, options, section: sectionRaw || null },
  });

  await writeAuditLog({ userId: session.userId, action: "UPDATE", resource: "CustomQuestion", resourceId: questionId });

  revalidatePath("/settings");
}

export async function setCustomQuestionActive(questionId: string, active: boolean) {
  const session = await requireRole("ADMIN");
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
