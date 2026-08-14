import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  // Lets `next start` expose the testing API the instant() e2e helper needs.
  experimental: { exposeTestingApiInProductionBuild: true },
  ...(process.env.OPTIONS_PLANNER_DIST_DIR
    ? { distDir: process.env.OPTIONS_PLANNER_DIST_DIR }
    : {}),
};

export default withWorkflow(nextConfig);
