import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Fallback to a mock instance if env vars are missing (prevents crashes in local dev)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : {
        sadd: async () => 0,
        eval: async () => [1, 1, 0, 1], // mock successful rate limit response
      } as any;

/**
 * Standard API rate limit: 100 requests per 10 seconds per IP/User.
 */
export const standardRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '10 s'),
  analytics: true,
  prefix: '@coco/ratelimit:standard',
});

/**
 * Strict API rate limit for high-cost endpoints (e.g. Model inference, Ranger start):
 * 10 requests per 60 seconds per IP/User.
 */
export const strictRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  analytics: true,
  prefix: '@coco/ratelimit:strict',
});
