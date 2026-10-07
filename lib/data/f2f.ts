import "server-only";
import { db } from "@/lib/db";

export async function getF2FContacts(memberId: string) {
  return db.f2FContact.findMany({
    where: { memberId },
    orderBy: { contactDate: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}
