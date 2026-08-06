import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel bills image optimization per source image; the portfolio's shots
    // are already sized for the layout, so serve them straight from /public.
    unoptimized: true,
  },
};

export default nextConfig;
