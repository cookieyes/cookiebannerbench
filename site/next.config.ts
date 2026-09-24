import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Every route is prerendered; nothing fetches at request time.
  output: "export",
  // Exports cmp/<vendor>/index.html, so the page and its OG image can share a
  // directory. With trailingSlash:false the directory shadowed the .html file.
  trailingSlash: true,
  images: { unoptimized: true },
  // The whole stylesheet is ~7 KB gzipped. Inlining it removes the one
  // render-blocking request every page otherwise makes before first paint.
  experimental: { inlineCss: true },
};

export default config;
