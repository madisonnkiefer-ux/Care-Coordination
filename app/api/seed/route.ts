import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDemoData } from "@/prisma/seed-data";
import { seedResources } from "@/prisma/resource-seed-data";

// One-time deploy-setup endpoint for a freshly-created database: loads the
// same fictional demo clinic/members used in local dev. Safe to hit more
// than once — clinic/member seeding no-ops once the demo clinic exists, but
// resource-directory seeding runs independently (also idempotent) so this
// can be re-hit later to backfill resources on an already-seeded database.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.clinic.findUnique({ where: { id: "demo-clinic" } });
  if (existing) {
    const admin = await db.user.findFirst({ where: { clinicId: existing.id, role: "ADMIN" } });
    const resourceResult = admin ? await seedResources(db, existing.id, admin.id) : { created: 0, updated: 0, total: 0, skipped: true };
    return NextResponse.json({ message: "Already seeded — demo-clinic exists.", resources: resourceResult });
  }

  const result = await seedDemoData(db);
  return NextResponse.json({ message: "Seeded successfully.", ...result });
}
