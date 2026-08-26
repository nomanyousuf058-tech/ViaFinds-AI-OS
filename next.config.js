/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Compiler (not yet stable for production)
  reactCompiler: false,

  // Security: do not expose framework identity in response headers
  poweredByHeader: false,

  // Enable gzip compression for self-hosted / custom server scenarios
  compress: true,

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