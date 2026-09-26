import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * Emit a self-contained server bundle with only the traced dependencies.
   *
   * The deployment image previously carried the whole of node_modules — several
   * hundred megabytes, exported and pushed on every deploy. Standalone traces
   * what the server actually imports and writes a `server.js` beside it, which
   * makes the image small enough that the export and container start stop being
   * a measurable part of the deploy.
   *
   * It also makes a cached-dependency Dockerfile possible: the runtime stage
   * copies the traced output instead of reinstalling.
   */
  output: 'standalone',
  experimental: {
    serverActions: {
      /**
       * A submission carries its pictures, and the default is 1 MB.
       *
       * /write offers a cover plus four pictures at MAX_IMAGE_BYTES (8 MB)
       * each, so the form was promising forty megabytes to a server action
       * that would refuse anything over one. Any real photograph broke it: the
       * request died before `submitArticle` ran, and the client showed
       * "Application error: a client-side exception has occurred" with nothing
       * in it to suggest the size was the problem. A 95 KB test image passed,
       * which is how it survived review.
       *
       * Keep this above MAX_IMAGES * MAX_IMAGE_BYTES plus the cover, or the
       * limit the form states stops being the limit it enforces.
       */
      bodySizeLimit: '48mb',
    },
  },
  eslint: {
    /**
     * Lint is not skipped, it is moved. `next build` runs ESLint over the whole
     * project again, which cost about three minutes of every deploy on this
     * server and re-checked code that `npm run lint` had already passed before
     * the commit that triggered the build.
     *
     * Type checking is deliberately NOT disabled here — that one catches real
     * breakage a lint pass would not, and it stays in the build.
     *
     * If deploys ever run from a machine that has not linted, put this back.
     */
    ignoreDuringBuilds: true,
  },
  images: {
    // Featured images must be >= 1200px wide for Google Discover.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
  },
  async rewrites() {
    return [
      // IndexNow verification file. Runs after filesystem routes, so
      // /robots.txt and /sitemap.xml are unaffected.
      { source: '/:key.txt', destination: '/api/indexnow-key?key=:key' },
    ];
  },
  async headers() {
    return [
      {
        // Uploaded screenshots and featured images are content-addressed on write,
        // so they can be cached hard.
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
