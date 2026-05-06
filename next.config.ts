import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig;
