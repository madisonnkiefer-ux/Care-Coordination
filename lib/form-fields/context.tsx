"use client";

import { createContext, useContext } from "react";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";

// Lets every field primitive in components/intake/form-fields.tsx resolve
// its own admin override automatically from just the `name` prop it already
// receives — no per-field wiring needed at ~250 existing call sites. A form
// component opts in once by wrapping its content in
// <FormFieldsProvider form="cna" fields={fields}>.
//
// `locked`/`isAdmin` piggyback on this same mechanism for the same reason:
// every field primitive already reads this context, so this is the one
// place that needs to know "is this record signed, and can the current
// user edit dates on it anyway" — not ~250 call sites. Forms with no
// signing concept (CCP, HEDIS) just never pass `locked`, which defaults to
// false and leaves every field exactly as editable as before.
type FormFieldsContextValue = { form: string; fields: ResolvedFormFields; locked: boolean; isAdmin: boolean };

const FormFieldsContext = createContext<FormFieldsContextValue | null>(null);

export function FormFieldsProvider({
  form,
  fields,
  locked = false,
  isAdmin = false,
  children,
}: {
  form: string;
  fields: ResolvedFormFields;
  locked?: boolean;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  return <FormFieldsContext.Provider value={{ form, fields, locked, isAdmin }}>{children}</FormFieldsContext.Provider>;
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

// Whether this record is signed/locked, and whether the current user is an
// admin — admins can still edit date fields on an otherwise-locked record
// (see DateField in components/intake/form-fields.tsx), a narrow,
// server-enforced carve-out for correcting a wrong date after signing
// without reopening the rest of a legally-signed record. No provider (a
// form with no signing concept at all, like CCP/HEDIS) means never locked.
export function useFormLock() {
  const ctx = useContext(FormFieldsContext);
  return { locked: ctx?.locked ?? false, isAdmin: ctx?.isAdmin ?? false };
}
