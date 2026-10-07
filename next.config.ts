import type { NextConfig } from "next";

// Article images live in the media bucket (MEDIA_BASE_URL); the hostname is
// derived from it so the optimizer never has to trust a wildcard.
const mediaHost = (() => {
  try {
    return new URL(process.env.MEDIA_BASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();
if (!mediaHost) {
  console.warn("[next.config] MEDIA_BASE_URL is not set: next/image will reject article images");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS project (sibling projects in GC-coding have
  // their own lockfiles, which Turbopack would otherwise infer as the root).
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    // Only the media bucket host — a wildcard would turn /_next/image
    // into an open proxy for arbitrary third-party images.
    remotePatterns: mediaHost ? [{ protocol: "https" as const, hostname: mediaHost }] : [],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      // Reclaim pixelhost.io legacy backlinks: /black-friday had a link and
      // 404'd; the old WordPress blog structure has no link value -> home.
      { source: "/black-friday", destination: "/", permanent: true },
      // Legacy /evo page (1 backlink, 404'd) — no evergreen value -> home.
      { source: "/evo", destination: "/", permanent: true },
      { source: "/blog", destination: "/", permanent: true },
      { source: "/tag/:path*", destination: "/", permanent: true },
      { source: "/author/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
