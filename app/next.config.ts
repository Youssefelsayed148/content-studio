import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// Load .env from parent directory
config({ path: path.join(__dirname, "..", ".env") });

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
    ],
  },
  async rewrites() {
    return [
      {
        // Serve cached thumbnails from the persistent THUMBNAIL_DIR (see
        // src/lib/thumbnail-cache.ts) instead of the ephemeral public/ dir.
        source: "/thumbnails/:path*",
        destination: "/api/thumbnails/file/:path*",
      },
    ];
  },
};

export default nextConfig;
