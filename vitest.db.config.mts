import { defineConfig } from "vitest/config";

/** Testes contra o Supabase local (precisa de `npx supabase start`). */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
