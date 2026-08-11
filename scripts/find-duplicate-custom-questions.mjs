// Ops utility: lists active custom questions (Settings > Additional
// Questions) so a duplicate of a built-in numbered question can be spotted
// and retired. Read-only by default.
//
// Usage:
//   node scripts/find-duplicate-custom-questions.mjs
//     Lists every active custom question: id, clinic, form, label, answers.
//
//   RETIRE_ID=<id> node scripts/find-duplicate-custom-questions.mjs
//     Sets that question's active flag to false (same as Settings' "Retire"
//     action) and writes a matching AuditLog row. Never deletes rows or
//     touches previously-collected answers.
import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const retireId = process.env.RETIRE_ID;
    if (retireId) {
      const before = await client.query('SELECT id, form, label, active FROM "CustomQuestion" WHERE id = $1', [retireId]);
      if (before.rows.length === 0) {
        console.log(`No CustomQuestion found with id ${retireId}`);
        return;
      }
      await client.query('UPDATE "CustomQuestion" SET active = false, "updatedAt" = now() WHERE id = $1', [retireId]);
      await client.query(
        'INSERT INTO "AuditLog" (id, "userId", action, resource, "resourceId", metadata, "createdAt") VALUES ($1, NULL, \'UPDATE\', \'CustomQuestion\', $2, $3, now())',
        [`ops_${Date.now()}`, retireId, JSON.stringify({ active: false, source: "ops-script: retired duplicate question" })]
      );
      console.log(`Retired CustomQuestion ${retireId} (was: "${before.rows[0].label}")`);
      return;
    }

    const res = await client.query(`
      SELECT cq.id, cq."clinicId", cq.form, cq.label, cq.active, cq."order",
             (SELECT count(*) FROM "CustomAnswer" ca WHERE ca."questionId" = cq.id) AS answer_count
      FROM "CustomQuestion" cq
      WHERE cq.active = true
      ORDER BY cq."clinicId", cq.form, cq."order"
    `);
    if (res.rows.length === 0) {
      console.log("No active custom questions found.");
      return;
    }
    for (const row of res.rows) {
      console.log(`${row.id}  [${row.form}]  answers=${row.answer_count}  "${row.label}"`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
