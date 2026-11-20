import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  rewrites: async () => {
    // Only proxy /static/ locally when developing against local backend.
    // In production (Vercel), media URLs are served directly via Cloudinary/Supabase CDN.
    if (isDev) {
      const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      return [
        {
          source: '/static/:path*',
          destination: `${backendUrl}/static/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
