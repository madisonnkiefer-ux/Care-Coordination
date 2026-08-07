import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// Soft-delete enforcement, centralized here rather than left to every
// caller to remember. Member/IntakeVersion/CarePlan/TocRecord are never
// hard-deleted (Medicaid/HIPAA retention), only flagged with deletedAt —
// see app/actions/delete.ts. Reads on these models are transparently
// scoped to non-deleted rows *unless* the caller explicitly filters on
// deletedAt itself (the admin "Deleted records" recovery view does this
// to see only the deleted ones). Writes (create/update/delete) are left
// untouched — a restore action needs to update an already-deleted row.
function withDefaultNotDeleted<A extends { where?: { deletedAt?: unknown } }>(args: A): A {
  if (args.where?.deletedAt === undefined) {
    args.where = { ...args.where, deletedAt: null };
  }
  return args;
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const base = new PrismaClient({ adapter });

  return base.$extends({
    name: "soft-delete",
    query: {
      member: {
        findMany: ({ args, query }) => query(withDefaultNotDeleted(args)),
        findFirst: ({ args, query }) => query(withDefaultNotDeleted(args)),
        count: ({ args, query }) => query(withDefaultNotDeleted(args)),
        // Rewritten as findFirst (findUnique can't take a non-unique deletedAt
        // filter) but must forward the *entire* args object — an earlier
        // version rebuilt this as `{ where: { ...args.where, deletedAt: null } }`,
        // which silently dropped `include`/`select`/etc., leaving every
        // relation on the result `undefined` instead of populated or null.
        findUnique: ({ args }) => base.member.findFirst(withDefaultNotDeleted(args)),
      },
      intakeVersion: {
        findMany: ({ args, query }) => query(withDefaultNotDeleted(args)),
        findFirst: ({ args, query }) => query(withDefaultNotDeleted(args)),
        count: ({ args, query }) => query(withDefaultNotDeleted(args)),
        findUnique: ({ args }) => base.intakeVersion.findFirst(withDefaultNotDeleted(args)),
      },
      carePlan: {
        findMany: ({ args, query }) => query(withDefaultNotDeleted(args)),
        findFirst: ({ args, query }) => query(withDefaultNotDeleted(args)),
        count: ({ args, query }) => query(withDefaultNotDeleted(args)),
        findUnique: ({ args }) => base.carePlan.findFirst(withDefaultNotDeleted(args)),
      },
      tocRecord: {
        findMany: ({ args, query }) => query(withDefaultNotDeleted(args)),
        findFirst: ({ args, query }) => query(withDefaultNotDeleted(args)),
        count: ({ args, query }) => query(withDefaultNotDeleted(args)),
        findUnique: ({ args }) => base.tocRecord.findFirst(withDefaultNotDeleted(args)),
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// For code that needs to type a `db` parameter (e.g. seed scripts run with
// this same extended client) — `PrismaClient` itself no longer matches
// since $extends() returns a structurally different (but compatible) type.
export type Db = typeof db;
