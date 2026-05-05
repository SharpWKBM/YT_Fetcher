/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['yt3.ggpht.com', 'yt3.googleusercontent.com'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
  },
  // Enable compression
  compress: true,
  // Generate ETags
  generateEtags: true,
  // Remove powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig
