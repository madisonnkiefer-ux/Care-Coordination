"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { createCustomQuestion, setCustomQuestionActive, deleteCustomQuestion, moveCustomQuestion } from "@/app/actions/custom-questions";
import type { SettingsCustomQuestion } from "@/lib/data/custom-questions";

const FORM_ORDER = ["demographics", "hra", "cna", "ccn", "ccp", "generalComm", "toc"] as const;
const FORM_LABELS: Record<string, string> = {
  demographics: "Demographics",
  hra: "HRA",
  cna: "CNA",
  ccn: "Care Coordination Notes",
  ccp: "CCP",
  generalComm: "General Communication",
  toc: "TOC",
};

const TYPE_LABELS: Record<string, string> = {
  TEXT: "Short text",
  TEXTAREA: "Text box (paragraph)",
  SELECT: "Dropdown",
  CHECKBOX_GROUP: "Checklist (check all that apply)",
  YES_NO: "Yes / No",
  DATE: "Date",
};
const OPTIONS_TYPES = new Set(["SELECT", "CHECKBOX_GROUP"]);

export function CustomQuestionsTab({ questions }: { questions: SettingsCustomQuestion[] }) {
  const byForm = new Map<string, SettingsCustomQuestion[]>();
  for (const q of questions) {
    const group = byForm.get(q.form);
    if (group) group.push(q);
    else byForm.set(q.form, [q]);
  }

  return (
    <div className="space-y-6 p-8">
      <p className="max-w-2xl text-sm text-stone-500">
        Add a question your office wants to track that isn&apos;t part of the standardized form — it appears at the
        end of the chosen form as an &quot;Additional Questions&quot; section. Retiring a question stops it from
        appearing on new forms; answers already collected stay on file.
      </p>
      {FORM_ORDER.map((form) => {
        const formQuestions = byForm.get(form) ?? [];
        return (
          <Card key={form} title={FORM_LABELS[form]}>
            <div className="space-y-3">
              {formQuestions.map((q, i) => (
                <ExistingQuestionRow key={q.id} question={q} isFirst={i === 0} isLast={i === formQuestions.length - 1} />
              ))}
              {formQuestions.length === 0 && <p className="text-sm text-stone-400">No additional questions yet.</p>}
              <AddQuestionForm form={form} existingQuestions={formQuestions} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ExistingQuestionRow({
  question,
  isFirst,
  isLast,
}: {
  question: SettingsCustomQuestion;
  isFirst: boolean;
  isLast: boolean;
}) {
  const canDelete = question.answerCount === 0;

  return (
    <div className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${question.active ? "border-stone-200" : "border-stone-200 bg-stone-50"}`}>
      <div className="flex items-start gap-2">
        <div className="flex flex-col">
          <form action={moveCustomQuestion.bind(null, question.id, "up")}>
            <button
              type="submit"
              disabled={isFirst}
              aria-label="Move up"
              title="Move up"
              className="text-stone-400 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-30"
            >
              ▲
            </button>
          </form>
          <form action={moveCustomQuestion.bind(null, question.id, "down")}>
            <button
              type="submit"
              disabled={isLast}
              aria-label="Move down"
              title="Move down"
              className="text-stone-400 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-30"
            >
              ▼
            </button>
          </form>
        </div>
        <div>
          <p className={`text-sm font-medium ${question.active ? "text-charcoal" : "text-stone-400"}`}>{question.label}</p>
          <p className="text-xs text-stone-400">
            {TYPE_LABELS[question.type]}
            {question.section ? ` · ${question.section}` : ""}
            {!question.active ? " · Retired" : ""}
            {question.answerCount > 0 ? ` · ${question.answerCount} answer${question.answerCount === 1 ? "" : "s"} on file` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <form action={setCustomQuestionActive.bind(null, question.id, !question.active)}>
          <button type="submit" className="text-xs font-medium text-stone-500 hover:text-charcoal hover:underline">
            {question.active ? "Retire" : "Restore"}
          </button>
        </form>
        {canDelete && (
          <form
            action={deleteCustomQuestion.bind(null, question.id)}
            onSubmit={(e) => {
              if (!confirm(`Permanently delete "${question.label}"? This can't be undone.`)) e.preventDefault();
            }}
          >
            <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline">
              Delete
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function AddQuestionForm({ form, existingQuestions }: { form: string; existingQuestions: SettingsCustomQuestion[] }) {
  const [type, setType] = useState("TEXT");
  const needsOptions = OPTIONS_TYPES.has(type);

  return (
    <form
      key={form}
      action={createCustomQuestion.bind(null, form)}
      onSubmit={() => setType("TEXT")}
      className="space-y-3 rounded-lg border border-dashed border-stone-300 p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Add a Question</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Question</label>
          <input
            name="label"
            required
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Type</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {existingQuestions.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Position</label>
          <select
            name="afterQuestionId"
            defaultValue=""
            className="w-full max-w-sm rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          >
            <option value="">At the end</option>
            {existingQuestions.map((q) => (
              <option key={q.id} value={q.id}>
                After: {q.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {needsOptions && (
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Options (one per line)</label>
          <textarea
            name="options"
            rows={3}
            className="w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Section (optional grouping label)</label>
        <input
          name="section"
          className="w-full max-w-sm rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
        />
      </div>
      <div className="flex justify-end">
        <button type="submit" className="rounded-md bg-charcoal px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
          Add Question
        </button>
      </div>
    </form>
  );
}
