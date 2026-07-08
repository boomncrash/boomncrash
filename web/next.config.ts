import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.ipfs.io" },
      { protocol: "https", hostname: "**.ipfs.dweb.link" },
    ],
  },
};

export default nextConfig;
