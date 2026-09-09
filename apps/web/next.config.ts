import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@noble/ed25519'],
  transpilePackages: [
    '@coco/common',
    '@coco/config',
    '@coco/protocol',
    '@coco/security',
    '@coco/events',
    '@coco/kernel',
    '@coco/model-fabric',
    '@coco/context',
    '@coco/intelligence',
    '@coco/execution',
    '@coco/verification',
    '@coco/realtime',
    '@coco/billing',
    '@coco/evolution',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
