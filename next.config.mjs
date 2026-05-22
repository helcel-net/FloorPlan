/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Automatically applies the repo name in GitHub Actions, but stays empty for local npm run dev
  basePath: isProd ? process.env.NEXT_PUBLIC_BASE_PATH : '',
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
