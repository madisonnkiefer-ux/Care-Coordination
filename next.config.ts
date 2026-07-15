import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker image (infra/README.md) — bundles only
  // the production dependencies actually needed at runtime.
  output: "standalone",
};

export default nextConfig;
