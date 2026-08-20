import { vi } from "vitest";

// A structural stand-in for the Prisma client used across app/actions/*.ts:
// `db.<model>.<method>` auto-vivifies into its own vi.fn() the first time
// it's accessed, defaulting to `[]` for findMany/count-shaped reads and
// `null` otherwise, so a test only needs to stub the calls it actually
// cares about. `$transaction` runs its callback against this same mock
// (matching how app/actions code does `db.$transaction(async (tx) => ...)`),
// so tests can set expectations on `db.<model>.<method>` regardless of
// whether the code under test calls it inside or outside a transaction.
export function createDbMock() {
  const models: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};

  function modelProxy(modelName: string) {
    if (!models[modelName]) models[modelName] = {};
    const methods = models[modelName];
    return new Proxy(
      {},
      {
        get(_target, method: string) {
          if (!methods[method]) {
            const defaultValue = method === "findMany" ? [] : method === "count" ? 0 : null;
            methods[method] = vi.fn().mockResolvedValue(defaultValue);
          }
          return methods[method];
        },
      }
    );
  }

  const transactionFn = vi.fn(async (arg: unknown) => {
    if (typeof arg === "function") return (arg as (tx: unknown) => unknown)(dbMock);
    return Promise.all(arg as Promise<unknown>[]);
  });

  const dbMock: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "$transaction") return transactionFn;
        return modelProxy(prop);
      },
    }
  );

  return dbMock;
}
