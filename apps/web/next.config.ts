import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@excelcabs/ui", "@excelcabs/types"],
  typedRoutes: true,
  agentRules: false,
  poweredByHeader: false,
};

export default nextConfig;
