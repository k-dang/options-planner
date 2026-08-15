import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // e2e/ holds Playwright specs; they run via `pnpm test:e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
