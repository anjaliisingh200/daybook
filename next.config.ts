import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second copy of the app (used by tests) build into its own folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Hides the round "N" badge Next.js draws in the corner while developing. It never appears in the real app.
  devIndicators: false,
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
