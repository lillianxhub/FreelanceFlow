import type { NextConfig } from 'next'
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:8081'
if (!/^https?:\/\/[^/?#]+$/.test(backendOrigin))
  throw new Error('BACKEND_ORIGIN must be an origin without trailing slash')
const config: NextConfig = {
  output: 'standalone',
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: { useTypeScriptCli: false },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendOrigin}/api/:path*` }]
  },
}
export default config
