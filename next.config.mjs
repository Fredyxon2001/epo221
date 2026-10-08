import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Public source digest only; no credentials or private env values enter Next's build env.
const noticeDigest = createHash('sha256').update(JSON.stringify([
  'src/app/privacidad/page.tsx', 'src/app/cookies/page.tsx',
  'src/components/CookieConsentProvider.tsx', 'src/components/ConsentMap.tsx', 'src/lib/cookie-consent.ts',
].map(file => [file, readFileSync(new URL(file, import.meta.url), 'utf8')]))).digest('hex');
const localBuildTag = /^[a-zA-Z0-9-]{1,40}$/.test(process.env.EPO_LOCAL_BUILD ?? '') ? process.env.EPO_LOCAL_BUILD : null;
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { EPO_NOTICE_DIGEST: noticeDigest },
  distDir: process.env.EPO_ISOLATED_TEST === '1' ? '.qa/next' : localBuildTag ? `.qa/production-${localBuildTag}` : '.next',
  reactStrictMode: true,
  images: { formats: ['image/avif', 'image/webp'], remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
      ],
    }];
  },
};
export default nextConfig;
