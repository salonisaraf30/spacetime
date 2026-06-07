import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  webpack(config, { dev }) {
    if (dev) {
      // Disable filesystem cache in dev to avoid ENOSPC errors on full disks
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
