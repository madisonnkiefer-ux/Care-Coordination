import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDemoData } from "@/prisma/seed-data";
import { seedResources } from "@/prisma/resource-seed-data";
import type { PrismaClient } from "@/app/generated/prisma/client";

// seedDemoData/seedResources are typed against the plain generated
// PrismaClient (they're also invoked from prisma/seed.ts with a raw
// client). lib/db.ts's `db` is that same client wrapped in a soft-delete
// query extension — structurally compatible for every call these seed
// functions make, just a different TS type after $extends().
const seedDb = db as unknown as PrismaClient;

// Constant-time comparison — a plain `!==` leaks timing information an
// attacker could use to recover the token character-by-character.
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// One-time deploy-setup endpoint for a freshly-created database: loads the
// same fictional demo clinic/members used in local dev. Safe to hit more
// than once — clinic/member seeding no-ops once the demo clinic exists, but
// resource-directory seeding runs independently (also idempotent) so this
// can be re-hit later to backfill resources on an already-seeded database.
//
// Gated by a dedicated SEED_ENDPOINT_TOKEN rather than SESSION_SECRET — the
// latter also signs every user's session JWT, so reusing it here turned this
// endpoint into a network-reachable oracle against that key.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const expected = process.env.SEED_ENDPOINT_TOKEN;
  if (!token || !expected || !safeCompare(token, expected)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.clinic.findUnique({ where: { id: "demo-clinic" } });
  if (existing) {
    const admin = await db.user.findFirst({ where: { clinicId: existing.id, role: "ADMIN" } });
    const resourceResult = admin ? await seedResources(seedDb, existing.id, admin.id) : { created: 0, updated: 0, total: 0, skipped: true };
    const [notificationCount, statusChangeCount] = await Promise.all([
      db.notification.count(),
      db.memberStatusChange.count(),
    ]);
    return NextResponse.json({
      message: "Already seeded — demo-clinic exists.",
      resources: resourceResult,
      schemaCheck: { notificationCount, statusChangeCount },
    });
  }

  const result = await seedDemoData(seedDb);
  return NextResponse.json({ message: "Seeded successfully.", ...result });
}
