import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd()
  },
  allowedDevOrigins: ["172.31.49.222", "localhost", "127.0.0.1"]
};

export default nextConfig;
