import { Card } from "@/components/ui";
import type { CustomQuestionForRecord } from "@/lib/custom-questions-shared";

// Renders admin-defined questions (Settings → Form Content → Additional
// Questions) appended to a standardized form. Each input's name is
// `custom_${question.id}` so lib/custom-questions-save.ts can read it back
// out of the same FormData the built-in fields already submit to.
export function CustomQuestionsSection({ questions }: { questions: CustomQuestionForRecord[] }) {
  if (questions.length === 0) return null;

  return (
    <Card title="Additional Questions">
      <div className="space-y-4">
        {questions.map((q) => (
          <CustomQuestionField key={q.id} question={q} />
        ))}
      </div>
    </Card>
  );
}

function CustomQuestionField({ question }: { question: CustomQuestionForRecord }) {
  const name = `custom_${question.id}`;
  const labelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500";
  const inputClass =
    "w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose";

  switch (question.type) {
    case "TEXT":
      return (
        <div>
          <label className={labelClass}>{question.label}</label>
          <input name={name} defaultValue={(question.value as string) ?? ""} className={inputClass} />
        </div>
      );
    case "TEXTAREA":
      return (
        <div>
          <label className={labelClass}>{question.label}</label>
          <textarea name={name} rows={3} defaultValue={(question.value as string) ?? ""} className={inputClass} />
        </div>
      );
    case "DATE":
      return (
        <div>
          <label className={labelClass}>{question.label}</label>
          <input type="date" name={name} defaultValue={(question.value as string) ?? ""} className={inputClass} />
        </div>
      );
    case "SELECT":
      return (
        <div>
          <label className={labelClass}>{question.label}</label>
          <select name={name} defaultValue={(question.value as string) ?? ""} className={inputClass}>
            <option value="">—</option>
            {question.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    case "YES_NO": {
      const value = question.value as boolean | null;
      return (
        <div>
          <p className="mb-1 text-sm font-medium text-stone-700">{question.label}</p>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="radio" name={name} value="yes" defaultChecked={value === true} className="h-4 w-4" />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="radio" name={name} value="no" defaultChecked={value === false} className="h-4 w-4" />
              No
            </label>
          </div>
        </div>
      );
    }
    case "CHECKBOX_GROUP": {
      const values = Array.isArray(question.value) ? (question.value as string[]) : [];
      return (
        <div>
          <p className="mb-1 text-sm font-medium text-stone-700">{question.label}</p>
          <div className="space-y-2">
            {question.options.map((opt) => (
              <label key={opt} className="flex items-start gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name={name}
                  value={opt}
                  defaultChecked={values.includes(opt)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
