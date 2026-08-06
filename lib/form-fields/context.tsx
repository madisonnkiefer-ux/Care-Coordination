"use client";

import { createContext, useContext } from "react";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";

// Lets every field primitive in components/intake/form-fields.tsx resolve
// its own admin override automatically from just the `name` prop it already
// receives — no per-field wiring needed at ~250 existing call sites. A form
// component opts in once by wrapping its content in
// <FormFieldsProvider form="cna" fields={fields}>.
type FormFieldsContextValue = { form: string; fields: ResolvedFormFields };

const FormFieldsContext = createContext<FormFieldsContextValue | null>(null);

export function FormFieldsProvider({
  form,
  fields,
  children,
}: {
  form: string;
  fields: ResolvedFormFields;
  children: React.ReactNode;
}) {
  return <FormFieldsContext.Provider value={{ form, fields }}>{children}</FormFieldsContext.Provider>;
}

// Returns the override for `name` in the enclosing form, or undefined if
// there's no provider (a form that hasn't been wired up yet) or no override
// has been set for this field. Callers always fall back to their own
// hardcoded default when this is undefined.
export function useFieldOverride(name: string) {
  const ctx = useContext(FormFieldsContext);
  if (!ctx) return undefined;
  return ctx.fields[`${ctx.form}.${name}`];
}
