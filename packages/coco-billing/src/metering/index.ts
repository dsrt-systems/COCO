import { prefixedId } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UsageRecordInput } from '@coco/protocol';

export interface TierLimits {
  monthly_credit_usd: number;
  max_parallel_agents: number;
  frontier_models_allowed: boolean;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  default: { monthly_credit_usd: 10.0, max_parallel_agents: 4, frontier_models_allowed: false },
  pro: { monthly_credit_usd: 100.0, max_parallel_agents: 16, frontier_models_allowed: true },
  ranger: { monthly_credit_usd: 500.0, max_parallel_agents: 64, frontier_models_allowed: true },
  enterprise: { monthly_credit_usd: 10000.0, max_parallel_agents: 256, frontier_models_allowed: true },
};

export class UsageMeter {
  constructor(private readonly supabase: SupabaseClient) {}

  async recordUsage(organizationId: string, input: UsageRecordInput): Promise<string> {
    const usageId = prefixedId('usage');
    const now = new Date().toISOString();

    const { error } = await this.supabase
      .schema('billing')
      .from('usage_records')
      .insert({
        usage_id: usageId,
        organization_id: organizationId,
        mission_id: input.mission_id ?? null,
        user_id: input.user_id ?? null,
        usage_type: input.usage_type,
        resource_unit: input.resource_unit,
        quantity: input.quantity,
        unit_price_usd: input.unit_price_usd,
        total_cost_usd: input.total_cost_usd,
        metadata: input.metadata,
        occurred_at: now,
      });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[coco/billing] Usage record insertion failed:', error.message);
    }

    return usageId;
  }

  async getCurrentPeriodSpend(organizationId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .schema('billing')
      .from('usage_records')
      .select('total_cost_usd')
      .eq('organization_id', organizationId)
      .gte('occurred_at', startOfMonth.toISOString());

    if (error || !data) return 0.0;

    return data.reduce((acc, row) => acc + Number(row.total_cost_usd ?? 0), 0.0);
  }
}

export * from './tier-guard.js';
export * from './tracker.js';

export * from './hooks.js';
