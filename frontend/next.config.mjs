import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    const draftkitApiUrl =
      process.env.DRAFTKIT_API_URL || process.env.NEXT_PUBLIC_DRAFTKIT_API_URL;

    if (!draftkitApiUrl || !draftkitApiUrl.trim()) {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${draftkitApiUrl.replace(/\/+$/, '')}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
