/** @type {import('next').NextConfig} */
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
    // Placeholder for missing images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Experimental features
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

module.exports = (phase) => ({
  ...nextConfig,
  // Keep production builds and development previews from overwriting each other locally.
  // On Vercel, Next.js requires the output directory to be '.next'.
  distDir:
    process.env.APPFORGE_DIST_DIR ||
    (process.env.VERCEL ? '.next' : phase === PHASE_DEVELOPMENT_SERVER ? '.next' : '.next-production'),
});
