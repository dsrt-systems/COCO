import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. BYPASSES RLS. Server-only.
 * Used exclusively by the security fabric and internal orchestration.
 */
export function createServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createServiceClient() must only be called on the server');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service client');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });
}
