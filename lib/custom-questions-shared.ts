// Types and pure helpers shared between server data-fetching
// (lib/data/custom-questions.ts, server-only) and client rendering
// (the tab components, which merge these definitions with whichever
// record's answers are currently selected).
export type CustomQuestionDef = {
  id: string;
  type: "TEXT" | "TEXTAREA" | "SELECT" | "CHECKBOX_GROUP" | "YES_NO" | "DATE";
  label: string;
  options: string[];
  section: string | null;
};

export type CustomQuestionForRecord = CustomQuestionDef & { value: unknown };

export function mergeCustomQuestions(
  defs: CustomQuestionDef[],
  answers: Record<string, unknown> | undefined
): CustomQuestionForRecord[] {
  return defs.map((def) => ({ ...def, value: answers?.[def.id] ?? null }));
}
