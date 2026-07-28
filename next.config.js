const { createClient } = require("@sanity/client");

const client = createClient({
  projectId: "e44z7hta",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: false,

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
      console.warn("Failed to load redirect rules from Sanity:", err);
      return [];
    }
  },
};

module.exports = nextConfig;