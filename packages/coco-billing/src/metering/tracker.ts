import type { SupabaseClient } from '@supabase/supabase-js';
import { UsageMeter } from './usage-meter';
import { TierEnvelopeGuard } from './tier-guard';
import { NotificationService } from '../notifications/index';

export interface ModelCallMeterInput {
  organizationId: string;
  missionId?: string;
  userId?: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  provider?: string;
}

export interface ToolCallMeterInput {
  organizationId: string;
  missionId?: string;
  userId?: string;
  toolId: string;
  wallTimeMs: number;
  unitPricePerSecond?: number;
}

export class UsageTracker {
  private meter: UsageMeter;
  private guard: TierEnvelopeGuard;
  private notifications: NotificationService;
  private warnedOrgs = new Map<string, Set<number>>();

  constructor(private readonly supabase: SupabaseClient) {
    this.meter = new UsageMeter(supabase);
    this.guard = new TierEnvelopeGuard(supabase);
    this.notifications = new NotificationService(supabase);
  }

  async trackModelCall(input: ModelCallMeterInput): Promise<void> {
    const quantity = input.inputTokens + input.outputTokens;
    const unitPrice = quantity > 0 ? input.costUsd / quantity : 0;

    await this.meter.recordUsage(input.organizationId, {
      mission_id: input.missionId,
      user_id: input.userId,
      usage_type: 'model_tokens',
      resource_unit: 'tokens',
      quantity,
      unit_price_usd: unitPrice,
      total_cost_usd: input.costUsd,
      metadata: {
        model_id: input.modelId,
        input_tokens: input.inputTokens,
        output_tokens: input.outputTokens,
        provider: input.provider ?? null,
      },
    });

    await this.maybeWarnBudget(input.organizationId, input.userId);
  }

  async trackToolCall(input: ToolCallMeterInput): Promise<void> {
    const seconds = Math.max(0.001, input.wallTimeMs / 1000);
    const unitPrice = input.unitPricePerSecond ?? 0.001;
    const total = seconds * unitPrice;

    await this.meter.recordUsage(input.organizationId, {
      mission_id: input.missionId,
      user_id: input.userId,
      usage_type: 'tool_seconds',
      resource_unit: 'seconds',
      quantity: seconds,
      unit_price_usd: unitPrice,
      total_cost_usd: total,
      metadata: {
        tool_id: input.toolId,
        wall_time_ms: input.wallTimeMs,
      },
    });

    await this.maybeWarnBudget(input.organizationId, input.userId);
  }

  async trackApproval(organizationId: string, userId?: string, missionId?: string): Promise<void> {
    await this.meter.recordUsage(organizationId, {
      mission_id: missionId,
      user_id: userId,
      usage_type: 'human_approval',
      resource_unit: 'calls',
      quantity: 1,
      unit_price_usd: 0,
      total_cost_usd: 0,
      metadata: {},
    });
  }

  private async maybeWarnBudget(organizationId: string, userId?: string): Promise<void> {
    try {
      const summary = await this.guard.getUsageSummary(organizationId);
      const pct = summary.utilization_pct;
      const thresholds = [50, 75, 90];

      let warned = this.warnedOrgs.get(organizationId);
      if (!warned) {
        warned = new Set();
        this.warnedOrgs.set(organizationId, warned);
      }

      for (const t of thresholds) {
        if (pct >= t && !warned.has(t)) {
          warned.add(t);
          await this.sendBudgetWarning(organizationId, userId, summary, t);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[coco/billing] Budget warn check failed:', err);
    }
  }

  private async sendBudgetWarning(
    organizationId: string,
    userId: string | undefined,
    summary: Awaited<ReturnType<TierEnvelopeGuard['getUsageSummary']>>,
    threshold: number
  ): Promise<void> {
    let email = typeof process !== 'undefined' ? process.env['BILLING_ALERT_EMAIL'] : undefined;

    if (!email && userId) {
      const { data } = await this.supabase
        .schema('identity')
        .from('users')
        .select('primary_email')
        .eq('user_id', userId)
        .maybeSingle();
      email = data?.primary_email ?? undefined;
    }

    if (!email) {
      // eslint-disable-next-line no-console
      console.warn(
        `[coco/billing] Budget ${threshold}% reached for org ${organizationId} but no recipient email`
      );
      return;
    }

    await this.notifications.sendEmail(organizationId, {
      recipient_email: email,
      subject: `COCO budget alert: ${threshold}% of ${summary.tier} tier credits used`,
      template_id: 'budget_warning',
      template_vars: {
        organization_id: organizationId,
        tier: summary.tier,
        threshold_pct: threshold,
        spent_usd: Number(summary.spent_usd.toFixed(4)),
        monthly_cap_usd: summary.monthly_cap_usd,
        remaining_usd: Number(summary.remaining_usd.toFixed(4)),
        utilization_pct: Number(summary.utilization_pct.toFixed(1)),
        by_type: summary.by_type,
      },
    });
  }
}
