import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    turbo: {
      resolveAlias: {
        // Ensure tailwindcss is resolved from web-dashboard/node_modules
        tailwindcss: path.resolve(__dirname, "node_modules/tailwindcss"),
        "@tailwindcss/postcss": path.resolve(__dirname, "node_modules/@tailwindcss/postcss"),
      },
    },
  },
};

export default nextConfig;
