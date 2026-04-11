import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Keep pdf-parse and mammoth server-only (they use Node.js fs/Buffer)
  serverExternalPackages: ["pdf-parse", "mammoth"],
}

export default nextConfig
