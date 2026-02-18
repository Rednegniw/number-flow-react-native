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
      // Uses :match(.*) instead of :path* to handle trailing slashes in PostHog URLs
      {
        source: '/ph/static/:match(.*)',
        destination: 'https://us-assets.i.posthog.com/static/:match',
      },
      {
        source: '/ph/:match(.*)',
        destination: 'https://us.i.posthog.com/:match',
      },
    ];
  },
};

export default withMDX(config);
