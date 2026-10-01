import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", 
  register: true,
});

const nextConfig: NextConfig = {
  // 🔥 FIX: Add this empty object to silence the Next.js 16 bundler error
  turbopack: {}, 
};

export default withPWA(nextConfig);