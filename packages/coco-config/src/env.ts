import { z } from 'zod';

/**
 * Typed environment. Every var COCO reads is declared here.
 * Missing critical vars fail fast at boot.
 */
const EnvSchema = z.object({
  // Runtime
  COCO_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  COCO_REGION: z.string().default('us-east-1'),
  COCO_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),
  SUPABASE_DB_URL: z.string().optional(),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Model providers
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // Sandbox
  E2B_API_KEY: z.string().optional(),

  // Observability
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_HOST: z.string().url().optional(),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Feature flags
  COCO_ENABLE_RANGER: z.string().default('false').transform((v) => v === 'true'),
  COCO_ENABLE_LOCAL_MODELS: z.string().default('false').transform((v) => v === 'true'),
  COCO_ENABLE_EVOLUTION: z.string().default('false').transform((v) => v === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    throw new Error('Invalid environment variables');
  }
  cached = parsed.data;
  return cached;
}

/**
 * Server-only environment (throws if called from client code).
 * Use for secret-key access.
 */
export function serverEnv(): Env {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() must not be called from client code');
  }
  return env();
}
