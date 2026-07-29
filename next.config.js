/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Compiler (not yet stable for production)
  reactCompiler: false,

  // Security: do not expose framework identity in response headers
  poweredByHeader: false,

  // Enable gzip compression for self-hosted / custom server scenarios
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
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

  async redirects() {
    try {
      // Lazily require the Sanity client only when redirects() is invoked,
      // not at module load time. This prevents startup crashes when Sanity
      // is slow or unreachable during cold starts.
      const { createClient } = require("@sanity/client");
      const client = createClient({
        projectId: "e44z7hta",
        dataset: "production",
        apiVersion: "2024-01-01",
        useCdn: false,
      });

      const sanityRedirects = await client.fetch(
        '*[_type=="redirect"]{from,to,statusCode}'
      );

      return (sanityRedirects || []).map((r) => ({
        source: r.from.startsWith("/") ? r.from : `/${r.from}`,
        destination:
          r.to.startsWith("/") || r.to.startsWith("http")
            ? r.to
            : `/${r.to}`,
        permanent: r.statusCode === 301,
      }));
    } catch (err) {
      console.warn("Failed to load redirect rules from Sanity:", err.message);
      return [];
    }
  },

  webpack(config, { isServer }) {
    // Exclude non-source directories and Windows protected paths from the
    // file watcher. This eliminates the "System Volume Information" Watchpack
    // warning and speeds up dev-server hot-reload scans.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/studio/node_modules/**",
        "**/studio/dist/**",
        "**/backups/**",
        "**/logs/**",
        "**/images/**",
        "**/data/**",
        "**/docker/**",
        "**/docs/**",
        "**/prompts/**",
        "**/workflows/**",
        // Windows System Volume Information — inaccessible, causes noisy warnings
        "**/System Volume Information/**",
      ],
    };
    return config;
  },
};

module.exports = nextConfig;