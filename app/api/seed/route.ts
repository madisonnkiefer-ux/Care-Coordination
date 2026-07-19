import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDemoData } from "@/prisma/seed-data";

// One-time deploy-setup endpoint for a freshly-created database: loads the
// same fictional demo clinic/members used in local dev. Safe to hit more
// than once — it no-ops if the demo clinic already exists — but should be
// deleted once the target environment is seeded.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.clinic.findUnique({ where: { id: "demo-clinic" } });
  if (existing) {
    return NextResponse.json({ message: "Already seeded — demo-clinic exists." });
  }

  const result = await seedDemoData(db);
  return NextResponse.json({ message: "Seeded successfully.", ...result });
}
