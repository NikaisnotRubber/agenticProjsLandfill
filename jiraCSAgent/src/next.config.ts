import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@langchain/langgraph', '@langchain/core']
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  },
}

export default nextConfig