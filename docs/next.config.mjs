import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },

      // PostHog reverse proxy (path intentionally non-obvious to avoid ad-blocker filter lists)
      {
        source: '/ph/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ph/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
};

export default withMDX(config);
