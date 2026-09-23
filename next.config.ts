import type { NextConfig } from "next";

// GitHub Pages serves project sites under /<repo>. The deploy workflow sets
// this from actions/configure-pages; it's empty locally and for a user site.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  // Pin the workspace root; a stray lockfile higher up would otherwise win.
  outputFileTracingRoot: process.cwd(),
  basePath,
  trailingSlash: true,
  images: {
    // Static export has no image optimization server.
    unoptimized: true,
  },
  // Extra hosts allowed to load dev assets (e.g. a phone on the LAN),
  // comma-separated in .env.local.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",").map((origin) => origin.trim()) ?? [],
};

export default nextConfig;
