import type { SupabaseClient } from '@supabase/supabase-js';
import { UsageTracker } from './tracker';
import { TierEnvelopeGuard } from './tier-guard';

export async function assertOrgCanSpend(
  supabase: SupabaseClient,
  organizationId: string,
  opts?: { estimated_cost_usd?: number; requires_frontier?: boolean; parallel_agents?: number }
) {
  const guard = new TierEnvelopeGuard(supabase);
  const decision = await guard.checkEnvelope(organizationId, opts);
  if (!decision.allowed) {
    const err = new Error(decision.message);
    (err as any).code = decision.reason;
    (err as any).remaining_usd = decision.remaining_usd;
    throw err;
  }
  return decision;
}

export async function meterModelInference(
  supabase: SupabaseClient,
  args: {
    organizationId: string;
    missionId?: string;
    userId?: string;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    provider?: string;
  }
): Promise<void> {
  const tracker = new UsageTracker(supabase);
  await tracker.trackModelCall(args);
}

export async function meterToolInvocation(
  supabase: SupabaseClient,
  args: {
    organizationId: string;
    missionId?: string;
    userId?: string;
    toolId: string;
    wallTimeMs: number;
  }
): Promise<void> {
  const tracker = new UsageTracker(supabase);
  await tracker.trackToolCall(args);
}
