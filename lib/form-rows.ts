// Repeatable rows (team members, medications, etc.) are submitted as parallel
// arrays: every row renders the same fields under the same `name`, so
// formData.getAll(name) returns one array per field, in row order. Zip them
// back into row objects, keyed by field name. Rows where every field is
// empty are dropped.
//
// `prefix` namespaces the actual input name (e.g. "teamMember.name") —
// required because the CCP form has several of these repeatable sections
// (team members, medications, backup contacts, disaster contacts) inside
// one single <form>, and more than one of them uses the same field names
// ("name", "phone"). Without a prefix, formData.getAll("name") on save
// would collect every section's "name" inputs mixed together in DOM
// order, silently cross-wiring rows between unrelated sections.
export function zipRows<K extends string>(
  formData: FormData,
  fields: readonly K[],
  prefix: string
): Record<K, string | null>[] {
  const columns = fields.map((f) => formData.getAll(`${prefix}.${f}`).map((v) => (typeof v === "string" ? v.trim() : "")));
  const rowCount = Math.max(0, ...columns.map((c) => c.length));

  const rows: Record<K, string | null>[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row = {} as Record<K, string | null>;
    let hasValue = false;
    fields.forEach((field, colIndex) => {
      const value = columns[colIndex][i] || null;
      row[field] = value;
      if (value) hasValue = true;
    });
    if (hasValue) rows.push(row);
  }
  return rows;
}
