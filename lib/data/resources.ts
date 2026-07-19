import "server-only";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function listResources() {
  const session = await verifySession();

  return db.resourceEntry.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { name: "asc" },
  });
}
