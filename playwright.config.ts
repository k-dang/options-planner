import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3101);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Instant navigation is production-build behaviour. `next dev` compiles
    // routes on demand, so a shell prefetch races the first compile.
    command: `pnpm build && pnpm start --port ${port} --hostname 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      // Own port and distDir so the suite never touches the dev server on
      // :3000 or its .next dir. Generated chain keeps runs offline.
      OPTION_CHAIN_PROVIDER: "generated",
      OPTIONS_PLANNER_DIST_DIR: ".next-e2e",
    },
  },
});
