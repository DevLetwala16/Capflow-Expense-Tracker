/** @type {import("next").NextConfig} */
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

module.exports = nextConfig;
