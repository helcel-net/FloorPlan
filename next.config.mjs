import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Automatically applies the repo name in GitHub Actions, but stays empty for local npm run dev
  basePath: isProd ? process.env.NEXT_PUBLIC_BASE_PATH : '',
  turbopack: {
    root: workspaceRoot
  },
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
