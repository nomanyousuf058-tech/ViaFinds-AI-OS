/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 defaults to Turbopack. An empty turbopack config declares
  // intent so the presence of the webpack function below (used only by
  // `next dev --webpack`) does not trigger a config-conflict error.
  turbopack: {},

  // Disable React Compiler (not yet stable for production)
  reactCompiler: false,

  // Security: do not expose framework identity in response headers
  poweredByHeader: false,

  // Enable gzip compression for self-hosted / custom server scenarios
  compress: true,

  // The database endpoint is a session-mode pooler capped at 15 client
  // connections. Next spawns several static-generation workers, each with its
  // own connection pool, so the default concurrency exhausts the pooler and
  // prerendering fails with EMAXCONNSESSION. Keep generation deliberately
  // serial; the build is not the hot path.
  experimental: {
    staticGenerationMaxConcurrency: 2,
    staticGenerationMinPagesPerWorker: 1000,
    staticGenerationRetryCount: 2,
  },

  images: {
   unoptimized: true,

   remotePatterns: [
     {
       protocol: "https",
       hostname: "lh3.googleusercontent.com",
     },
     {
       protocol: "https",
       hostname: "api.qrserver.com",
     },
   ],
 },


  webpack(config, { isServer }) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/backups/**",
        "**/logs/**",
        "**/images/**",
        "**/data/**",
        "**/docker/**",
        "**/docs/**",
        "**/prompts/**",
        "**/workflows/**",
        "**/System Volume Information/**",
      ],
    }
    return config
  },
};

module.exports = nextConfig;