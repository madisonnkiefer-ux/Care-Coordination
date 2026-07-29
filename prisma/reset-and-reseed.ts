// One-off cutover script: wipes all Member rows (cascading away their
// Demographics/CNA/HRA/Notes/IntakeVersion/CarePlan/etc.) and reseeds fresh
// demo data through the current schema. Demo/dev data only — never run
// against a database holding real PHI. Clinic and User rows are left
// alone (upserted, not recreated) so existing logins keep working.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { seedDemoData } from "./seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

db.member
  .deleteMany({})
  .then((result) => {
    console.log(`Deleted ${result.count} existing member(s).`);
    return seedDemoData(db);
  })
  .then((result) => {
    console.log(`Office code: ${result.clinicCode}`);
    console.log(`Demo login password for all users: ${result.demoPassword}`);
    console.log("Users:", result.users.map((u) => `${u.email} (${u.role})`).join(", "));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
