import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  rewrites: async () => [
    {
      source: '/static/:path*',
      destination: 'http://127.0.0.1:8000/static/:path*',
    },
  ],
};

export default nextConfig;
