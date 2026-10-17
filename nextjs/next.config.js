const { ensureAllDirs } = require("./scripts/prepare-next");

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    exclude: [
      /\/_next\/static\/.*(?<!\.p)\.woff2/,
      /\.map$/,
      /^manifest.*\.js$/,
      /_buildManifest\.js$/,
      /_ssgManifest\.js$/,
    ],
  },
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return {
        fallback: [
          {
            source: "/_next/static/:buildId/_buildManifest.js",
            destination: "/_next/static/development/_buildManifest.js",
          },
          {
            source: "/_next/static/:buildId/_ssgManifest.js",
            destination: "/_next/static/development/_ssgManifest.js",
          },
        ],
      };
    }
    return [];
  },
  // Fix HMR on Windows paths with spaces and ensure .next directories exist
  webpack: (config, { dev }) => {
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.beforeCompile.tap("EnsureDirsPlugin", () => {
          ensureAllDirs();
        });
        compiler.hooks.done.tap("EnsureDirsPlugin", () => {
          ensureAllDirs();
        });
      },
    });

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
