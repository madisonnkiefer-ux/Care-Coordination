import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      // The real package throws on import outside a "react-server" bundling
      // condition (see node_modules/server-only) — under plain Node/Vitest
      // that condition is never set, so every server-only module would
      // throw just by being imported. Tests never touch the real DB/cookie
      // APIs those files guard (db/dal/audit/next-* are mocked per test),
      // so the guard itself has nothing to protect here.
      "server-only": path.resolve(rootDir, "test/stubs/server-only.ts"),
      "@/": path.resolve(rootDir, "./") + "/",
    },
  },
});
