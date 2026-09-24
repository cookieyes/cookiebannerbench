import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Identical across every benchmark app: the page under test must differ
  // only by the consent SDK it loads.
  poweredByHeader: false,
};

export default config;
