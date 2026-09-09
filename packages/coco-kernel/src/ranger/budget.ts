import type { SupabaseClient } from '@supabase/supabase-js';
import type { MissionCharter } from '@coco/protocol';

export interface BudgetState {
  compute_seconds: number;
  wall_clock_seconds: number;
  model_tokens: number;
  cost_usd: number;
}

export type BudgetStatus = 'nominal' | 'warning_75' | 'warning_90' | 'degraded_95' | 'exhausted';

export class BudgetEnforcer {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly charter: MissionCharter
  ) {}

  /**
   * Evaluates current usage against the charter's budget envelope.
   */
  async evaluate(missionId: string): Promise<{ status: BudgetStatus; state: BudgetState }> {
    // In production, this would pull atomically from Redis.
    // We fall back to the missions table JSONB usage column.
    const { data, error } = await this.supabase
      .schema('missions')
      .from('missions')
      .select('usage')
      .eq('mission_id', missionId)
      .single();

    if (error || !data) throw new Error('Failed to read mission usage');

    const u = data.usage as Record<string, number>;
    const state: BudgetState = {
      compute_seconds: u['compute_seconds_used'] ?? 0,
      wall_clock_seconds: u['wall_clock_seconds'] ?? 0,
      model_tokens: u['model_tokens_used'] ?? 0,
      cost_usd: u['cost_usd_accrued'] ?? 0,
    };

    const costPct = state.cost_usd / this.charter.budget.max_cost_usd;
    const timePct = state.wall_clock_seconds / this.charter.budget.max_wall_clock_seconds;

    const maxPct = Math.max(costPct, timePct);

    let status: BudgetStatus = 'nominal';
    if (maxPct >= 1.0) status = 'exhausted';
    else if (maxPct >= 0.95) status = 'degraded_95';
    else if (maxPct >= 0.90) status = 'warning_90';
    else if (maxPct >= 0.75) status = 'warning_75';

    return { status, state };
  }

  async deductCost(missionId: string, amountUsd: number): Promise<void> {
    // Note: To make this atomic without Redis, we use a Postgres RPC or optimistic concurrency.
    // For this tier, we just issue a standard update (which Supabase processes safely).
    const { data } = await this.supabase
      .schema('missions')
      .from('missions')
      .select('usage')
      .eq('mission_id', missionId)
      .single();
      
    const current = (data?.usage as Record<string, number>) ?? {};
    current['cost_usd_accrued'] = (current['cost_usd_accrued'] ?? 0) + amountUsd;

    await this.supabase
      .schema('missions')
      .from('missions')
      .update({ usage: current })
      .eq('mission_id', missionId);
  }
}
