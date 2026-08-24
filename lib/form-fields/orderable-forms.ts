import {
  DEMOGRAPHICS_FIELD_KEYS,
  HRA_FIELD_KEYS,
  CNA_FIELD_KEYS,
  CCN_FIELD_KEYS,
  TOC_FIELD_KEYS,
  CCP_FIELD_KEYS,
} from "@/lib/form-fields/registry";

// Forms with an admin-configurable field order (Settings → Form Content).
// Shared by lib/data/form-fields.ts (reading the resolved order) and
// app/actions/form-fields.ts (moveFormField's mutation) — previously
// duplicated between the two, kept as one source of truth here instead.
export const ORDERABLE_FORMS: Record<string, string[]> = {
  demographics: DEMOGRAPHICS_FIELD_KEYS,
  hra: HRA_FIELD_KEYS,
  cna: CNA_FIELD_KEYS,
  ccn: CCN_FIELD_KEYS,
  toc: TOC_FIELD_KEYS,
  ccp: CCP_FIELD_KEYS,
};
