import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker image (infra/README.md) — bundles only
  // the production dependencies actually needed at runtime. Only the
  // Docker build opts in (via DOCKER_BUILD): Vercel's own builder expects
  // the normal .next layout and fails its build-output tracing step
  // (missing next-server.js.nft.json) when standalone output is forced on.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
