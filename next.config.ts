import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* standard config options */
  experimental: {
    agentUpgrade: 'security',
  } as any,
};

export default nextConfig;
