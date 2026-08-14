import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";

// Called from within each form's own save action (saveDemographics, saveHra,
// etc.) against the SAME FormData already submitted — custom questions
// render inside the same <form> as the built-in fields, so their answers
// arrive in the same submission. Not gated by role here: whoever can save
// the form can answer its custom questions, same as any built-in field.
export async function saveCustomAnswers(clinicId: string, form: string, recordId: string, formData: FormData) {
  const questions = await db.customQuestion.findMany({ where: { clinicId, form, active: true } });
  if (questions.length === 0) return;

  await Promise.all(
    questions.map(async (q) => {
      const fieldName = `custom_${q.id}`;
      let value: string | boolean | string[] | null;

      if (q.type === "CHECKBOX_GROUP") {
        value = formData.getAll(fieldName).filter((v): v is string => typeof v === "string");
      } else if (q.type === "YES_NO") {
        const raw = formData.get(fieldName);
        value = raw === "yes" ? true : raw === "no" ? false : null;
      } else {
        const raw = formData.get(fieldName);
        value = typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
      }

      await db.customAnswer.upsert({
        where: { questionId_recordId: { questionId: q.id, recordId } },
        create: { questionId: q.id, recordId, value: value as Prisma.InputJsonValue },
        update: { value: value as Prisma.InputJsonValue },
      });
    })
  );
}
