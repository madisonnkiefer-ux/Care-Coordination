import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { seedDemoData } from "./seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

seedDemoData(db)
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
