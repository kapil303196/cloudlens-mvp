/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@react-pdf/renderer'],
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent canvas from being bundled on server (canvas-confetti is client-only)
      config.externals = [...(config.externals ?? []), 'canvas'];
    }
    return config;
  },
};

module.exports = nextConfig;
