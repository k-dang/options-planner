import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  ...(process.env.OPTIONS_PLANNER_DIST_DIR
    ? { distDir: process.env.OPTIONS_PLANNER_DIST_DIR }
    : {}),
};

export default withWorkflow(nextConfig);
