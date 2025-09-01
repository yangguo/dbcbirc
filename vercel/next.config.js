/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB || 'cbirc',
    MONGODB_COLLECTION: process.env.MONGODB_COLLECTION || 'cases',
  },
  serverExternalPackages: ['mongodb'],
  // Vercel deployment optimization
  output: 'standalone',
}

module.exports = nextConfig