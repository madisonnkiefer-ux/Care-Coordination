// Wraps `prisma db push` to work around a Prisma schema-engine bug
// (P1014: "The underlying table for model X does not exist") that fires
// when a single db push both alters an existing enum's values AND adds a
// new table/model that references that enum. Splitting it into two passes
// — an enum-only push first, then the full schema — avoids it.
//
// This only matters for the MemberStatus enum expansion + MemberStatusChange
// table added together in one commit. Once that table exists (true for
// every deploy after the first), this script is a no-op wrapper around the
// normal single `prisma db push`.
import { Client } from "pg";
import { execSync } from "child_process";

async function memberStatusChangeTableExists() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
      ["MemberStatusChange"]
    );
    return res.rows[0].exists;
  } finally {
    await client.end();
  }
}

async function main() {
  const hasTable = await memberStatusChangeTableExists();

  if (!hasTable) {
    console.log(
      "MemberStatusChange table not found — applying the MemberStatus enum change in its own pass first (works around Prisma schema-engine issue P1014)."
    );
    execSync("npx prisma db push --accept-data-loss --schema=prisma/schema.step1-enum-fix.prisma", { stdio: "inherit" });
  }

  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
