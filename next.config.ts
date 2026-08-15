import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  // Expose the instant() testing API only in Playwright's production build.
  experimental: {
    exposeTestingApiInProductionBuild: process.env.PLAYWRIGHT_E2E === "1",
  },
  ...(process.env.OPTIONS_PLANNER_DIST_DIR
    ? { distDir: process.env.OPTIONS_PLANNER_DIST_DIR }
    : {}),
};

export default withWorkflow(nextConfig);
