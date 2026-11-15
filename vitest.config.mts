import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // "server-only" quebra fora do Next; nos testes vira um módulo vazio.
    alias: { "server-only": new URL("./tests/server-only-stub.ts", import.meta.url).pathname },
  },
});
