import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The context fabric expects a Supabase client scoped to the current
 * authenticated user's session (so RLS applies). API routes construct
 * this via createServerSupabase() and pass it in.
 */
export type SupaClient = SupabaseClient;

export interface ContextEnv {
  supabase: SupaClient;
  organizationId: string;
  userId?: string;
}
