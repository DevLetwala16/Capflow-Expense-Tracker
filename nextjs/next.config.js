/** @type {import("next").NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Fix HMR on Windows paths with spaces — use polling as fallback watcher
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,          // Check for changes every 1s
        aggregateTimeout: 300, // Debounce rebuilds by 300ms
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
