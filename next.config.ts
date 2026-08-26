import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile packages that use ESM and require bundling
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  // Next.js 16 uses Turbopack by default — configure it here
  turbopack: {},

  // Allow images from external domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.openstreetmap.org",
      },
      {
        protocol: "https",
        hostname: "cdnjs.cloudflare.com",
      },
    ],
  },
};

export default nextConfig;
