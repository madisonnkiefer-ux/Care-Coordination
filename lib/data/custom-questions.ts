import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import type { CustomQuestionDef } from "@/lib/custom-questions-shared";

export type { CustomQuestionDef, CustomQuestionForRecord } from "@/lib/custom-questions-shared";
export { mergeCustomQuestions } from "@/lib/custom-questions-shared";

// Active question definitions for a form — same list regardless of which
// specific record (which enrollment version, which CCP, etc.) is being
// viewed. Retiring a question stops it appearing here; its already-recorded
// answers stay in the database but aren't force-displayed on old records —
// unlike built-in fields, custom questions aren't part of the state's
// official form, so that's an acceptable simplification here.
export async function getActiveCustomQuestionDefs(clinicId: string, form: string): Promise<CustomQuestionDef[]> {
  const questions = await db.customQuestion.findMany({
    where: { clinicId, form, active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return questions.map((q) => ({
    id: q.id,
    type: q.type,
    label: q.label,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    section: q.section,
  }));
}

// Batched answers for a set of record ids (e.g. every enrollment version's
// Demographics.id for this member) — keyed by recordId, then questionId.
export async function getCustomAnswersByRecord(recordIds: string[]): Promise<Record<string, Record<string, unknown>>> {
  if (recordIds.length === 0) return {};
  const answers = await db.customAnswer.findMany({ where: { recordId: { in: recordIds } } });
  const byRecord: Record<string, Record<string, unknown>> = {};
  for (const a of answers) {
    (byRecord[a.recordId] ??= {})[a.questionId] = a.value;
  }
  return byRecord;
}

export type SettingsCustomQuestion = {
  id: string;
  form: string;
  section: string | null;
  type: "TEXT" | "TEXTAREA" | "SELECT" | "CHECKBOX_GROUP" | "YES_NO" | "DATE";
  label: string;
  options: string[];
  order: number;
  active: boolean;
  createdAt: Date;
  createdByName: string | null;
};

// Settings → Form Content → Additional Questions: every question (active or
// retired) this clinic has defined, admin-only.
export async function getCustomQuestionsForSettings(): Promise<SettingsCustomQuestion[]> {
  const session = await requireRole("ADMIN");
  const questions = await db.customQuestion.findMany({
    where: { clinicId: session.clinicId },
    orderBy: [{ form: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    include: { createdBy: { select: { name: true } } },
  });

  return questions.map((q) => ({
    id: q.id,
    form: q.form,
    section: q.section,
    type: q.type,
    label: q.label,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    order: q.order,
    active: q.active,
    createdAt: q.createdAt,
    createdByName: q.createdBy?.name ?? null,
  }));
}
