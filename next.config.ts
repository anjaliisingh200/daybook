import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second copy of the app (used by tests) build into its own folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
