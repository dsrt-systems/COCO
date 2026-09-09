import type { SupabaseClient } from '@supabase/supabase-js';
import type { MissionTier } from '@coco/protocol';
import { UsageMeter, TIER_LIMITS, type TierLimits } from './usage-meter';

export type EnvelopeDecision =
  | { allowed: true; remaining_usd: number; tier: string; limits: TierLimits }
  | {
      allowed: false;
      reason: 'budget_exhausted' | 'tier_forbidden' | 'no_subscription' | 'frontier_blocked';
      message: string;
      remaining_usd: number;
      tier: string;
      limits: TierLimits;
    };

export class TierEnvelopeGuard {
  private meter: UsageMeter;

  constructor(private readonly supabase: SupabaseClient) {
    this.meter = new UsageMeter(supabase);
  }

  async getSubscription(organizationId: string): Promise<{
    tier: MissionTier;
    status: string;
    compute_credits_monthly: number;
  } | null> {
    const { data } = await this.supabase
      .schema('billing')
      .from('subscriptions')
      .select('tier, status, compute_credits_monthly')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (!data) return null;
    return {
      tier: (data.tier as MissionTier) ?? 'default',
      status: data.status,
      compute_credits_monthly: Number(data.compute_credits_monthly ?? 10),
    };
  }

  async checkEnvelope(
    organizationId: string,
    options?: {
      estimated_cost_usd?: number;
      requires_frontier?: boolean;
      parallel_agents?: number;
    }
  ): Promise<EnvelopeDecision> {
    const sub = await this.getSubscription(organizationId);
    const tier = (sub?.tier ?? 'default') as string;
    const limits = TIER_LIMITS[tier] ?? TIER_LIMITS['default']!;
    const monthlyCap = sub?.compute_credits_monthly ?? limits.monthly_credit_usd;

    const spent = await this.meter.getCurrentPeriodSpend(organizationId);
    const remaining = Math.max(0, monthlyCap - spent);
    const estimated = options?.estimated_cost_usd ?? 0;

    if (sub && sub.status === 'past_due') {
      return {
        allowed: false,
        reason: 'no_subscription',
        message: 'Subscription is past due. Update payment method to continue.',
        remaining_usd: remaining,
        tier,
        limits,
      };
    }

    if (options?.requires_frontier && !limits.frontier_models_allowed) {
      return {
        allowed: false,
        reason: 'frontier_blocked',
        message: `Tier '${tier}' cannot use frontier models. Upgrade to Pro or Ranger.`,
        remaining_usd: remaining,
        tier,
        limits,
      };
    }

    if (
      options?.parallel_agents != null &&
      options.parallel_agents > limits.max_parallel_agents
    ) {
      return {
        allowed: false,
        reason: 'tier_forbidden',
        message: `Tier '${tier}' allows max ${limits.max_parallel_agents} parallel agents (requested ${options.parallel_agents}).`,
        remaining_usd: remaining,
        tier,
        limits,
      };
    }

    if (estimated > 0 && estimated > remaining) {
      return {
        allowed: false,
        reason: 'budget_exhausted',
        message: `Estimated cost $${estimated.toFixed(4)} exceeds remaining monthly credit $${remaining.toFixed(4)}.`,
        remaining_usd: remaining,
        tier,
        limits,
      };
    }

    if (remaining <= 0 && tier === 'default') {
      return {
        allowed: false,
        reason: 'budget_exhausted',
        message: `Default tier monthly credit exhausted ($${monthlyCap.toFixed(2)}). Upgrade to continue.`,
        remaining_usd: 0,
        tier,
        limits,
      };
    }

    return {
      allowed: true,
      remaining_usd: remaining,
      tier,
      limits,
    };
  }

  async getUsageSummary(organizationId: string): Promise<{
    tier: string;
    monthly_cap_usd: number;
    spent_usd: number;
    remaining_usd: number;
    utilization_pct: number;
    by_type: Record<string, number>;
    limits: TierLimits;
  }> {
    const sub = await this.getSubscription(organizationId);
    const tier = (sub?.tier ?? 'default') as string;
    const limits = TIER_LIMITS[tier] ?? TIER_LIMITS['default']!;
    const monthlyCap = sub?.compute_credits_monthly ?? limits.monthly_credit_usd;
    const spent = await this.meter.getCurrentPeriodSpend(organizationId);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data } = await this.supabase
      .schema('billing')
      .from('usage_records')
      .select('usage_type, total_cost_usd')
      .eq('organization_id', organizationId)
      .gte('occurred_at', startOfMonth.toISOString());

    const byType: Record<string, number> = {};
    for (const row of data ?? []) {
      const t = String(row.usage_type);
      byType[t] = (byType[t] ?? 0) + Number(row.total_cost_usd ?? 0);
    }

    return {
      tier,
      monthly_cap_usd: monthlyCap,
      spent_usd: spent,
      remaining_usd: Math.max(0, monthlyCap - spent),
      utilization_pct: monthlyCap > 0 ? Math.min(100, (spent / monthlyCap) * 100) : 0,
      by_type: byType,
      limits,
    };
  }
}
