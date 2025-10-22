/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure proper static file serving
  trailingSlash: false,
  // Fix for CSS loading issues
  experimental: {
    optimizeCss: false, // Disable CSS optimization to fix loading issues
  },
  // Ensure proper asset handling
  assetPrefix: '',
  basePath: '',
  // Add webpack configuration to fix CSS loading
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Fix for development server CSS loading
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
}

module.exports = nextConfig



