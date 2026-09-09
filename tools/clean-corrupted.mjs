import fs from 'node:fs';

const files = {
  'packages/coco-realtime/src/channels/metrics-aggregator.ts': `import type { LiveMissionMetrics, RealtimeEvent } from '../types/index';

export interface MetricsAggregatorOptions {
  mission_id: string;
  onUpdate: (metrics: LiveMissionMetrics) => void;
}

/**
 * Consumes realtime events and maintains a rolling LiveMissionMetrics snapshot.
 * Emits updates to the caller whenever metrics change.
 */
export class MetricsAggregator {
  private metrics: LiveMissionMetrics;
  private activeAgentIds = new Set<string>();

  constructor(private readonly options: MetricsAggregatorOptions) {
    this.metrics = {
      mission_id: options.mission_id,
      active_agents: 0,
      completed_runs: 0,
      total_tool_calls: 0,
      total_model_calls: 0,
      total_tokens_input: 0,
      total_tokens_output: 0,
      total_cost_usd: 0,
      verification_passes: 0,
      verification_failures: 0,
      last_event_at: new Date().toISOString(),
    };
  }

  handle(event: RealtimeEvent): void {
    const row = event.payload as Record<string, unknown>;
    this.metrics.last_event_at = event.timestamp;

    switch (event.kind) {
      case 'agent.spawned': {
        const id = row['agent_instance_id'] as string | undefined;
        if (id) {
          this.activeAgentIds.add(id);
          this.metrics.active_agents = this.activeAgentIds.size;
        }
        break;
      }
      case 'agent.retired': {
        const id = row['agent_instance_id'] as string | undefined;
        if (id) {
          this.activeAgentIds.delete(id);
          this.metrics.active_agents = this.activeAgentIds.size;
        }
        break;
      }
      case 'agent.run_completed': {
        this.metrics.completed_runs += 1;
        break;
      }
      case 'model.call_completed': {
        this.metrics.total_model_calls += 1;
        this.metrics.total_tokens_input += Number(row['input_tokens'] ?? 0);
        this.metrics.total_tokens_output += Number(row['output_tokens'] ?? 0);
        this.metrics.total_cost_usd += Number(row['cost_usd'] ?? 0);
        break;
      }
      case 'tool.call_completed': {
        this.metrics.total_tool_calls += 1;
        break;
      }
      case 'verification.level_passed': {
        this.metrics.verification_passes += 1;
        break;
      }
      case 'verification.level_failed': {
        this.metrics.verification_failures += 1;
        break;
      }
      default:
        break;
    }

    this.options.onUpdate({ ...this.metrics });
  }

  snapshot(): LiveMissionMetrics {
    return { ...this.metrics };
  }
}
`,

  'packages/coco-realtime/src/channels/mission-channel.ts': `import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { RealtimeEvent, RealtimeEventKind, EventHandler } from '../types/index';

/**
 * MissionChannel subscribes to all fabric table changes filtered to a specific mission_id.
 * It normalizes raw Postgres change events into typed RealtimeEvents.
 */
export class MissionChannel {
  private channel: RealtimeChannel | null = null;
  private handlers = new Map<RealtimeEventKind, Set<EventHandler>>();
  private globalHandlers = new Set<EventHandler>();

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly missionId: string,
    private readonly organizationId: string
  ) {}

  on<T = Record<string, unknown>>(kind: RealtimeEventKind, handler: EventHandler<T>): this {
    if (!this.handlers.has(kind)) {
      this.handlers.set(kind, new Set());
    }
    this.handlers.get(kind)!.add(handler as EventHandler);
    return this;
  }

  onAny(handler: EventHandler): this {
    this.globalHandlers.add(handler);
    return this;
  }

  async subscribe(): Promise<void> {
    if (this.channel) {
      throw new Error('Channel already subscribed');
    }

    const channelName = \`coco:mission:\${this.missionId}\`;
    this.channel = this.supabase.channel(channelName);

    this.attachTableListener('missions', 'missions', (payload) => {
      this.emit(this.classifyMissionEvent(payload), payload);
    });

    this.attachTableListener('missions', 'tasks', (payload) => {
      this.emit(this.classifyTaskEvent(payload), payload);
    });

    this.attachTableListener('agents', 'agent_instances', (payload) => {
      this.emit(this.classifyAgentEvent(payload), payload);
    });

    this.attachTableListener('agents', 'agent_runs', (payload) => {
      const kind: RealtimeEventKind = payload.eventType === 'INSERT' 
        ? 'agent.run_started' 
        : 'agent.run_completed';
      this.emit(kind, payload);
    });

    this.attachTableListener('agents', 'agent_findings', (payload) => {
      this.emit('agent.finding_recorded', payload);
    });

    this.attachTableListener('agents', 'decisions', (payload) => {
      this.emit('decision.recorded', payload);
    });

    this.attachTableListener('models', 'model_calls', (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const row = (payload.new ?? {}) as Record<string, unknown>;
        if (row['completed_at']) {
          this.emit('model.call_completed', payload);
        }
      }
    });

    this.attachTableListener('tools', 'tool_calls', (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const row = (payload.new ?? {}) as Record<string, unknown>;
        if (row['completed_at']) {
          this.emit('tool.call_completed', payload);
        }
      }
    });

    this.attachTableListener('tools', 'sandboxes', (payload) => {
      const row = (payload.new ?? {}) as Record<string, unknown>;
      if (payload.eventType === 'INSERT') {
        this.emit('sandbox.allocated', payload);
      } else if (row['status'] === 'released') {
        this.emit('sandbox.released', payload);
      }
    });

    this.attachTableListener('verification', 'verifications', (payload) => {
      const row = (payload.new ?? {}) as Record<string, unknown>;
      if (payload.eventType === 'INSERT') {
        this.emit('verification.started', payload);
      } else if (row['completed_at']) {
        this.emit('verification.completed', payload);
      }
    });

    this.attachTableListener('verification', 'level_results', (payload) => {
      const row = (payload.new ?? {}) as Record<string, unknown>;
      const kind: RealtimeEventKind = row['status'] === 'passed' 
        ? 'verification.level_passed' 
        : 'verification.level_failed';
      this.emit(kind, payload);
    });

    this.attachTableListener('verification', 'critic_reports', (payload) => {
      this.emit('critic.report_emitted', payload);
    });

    this.attachTableListener('verification', 'repair_orders', (payload) => {
      this.emit('repair.order_issued', payload);
    });

    this.attachTableListener('memory', 'memories', (payload) => {
      const row = (payload.new ?? {}) as Record<string, unknown>;
      if (row['mission_id'] === this.missionId) {
        this.emit('memory.written', payload);
      }
    });

    this.attachTableListener('security', 'human_approvals', (payload) => {
      const row = (payload.new ?? {}) as Record<string, unknown>;
      const kind: RealtimeEventKind = payload.eventType === 'INSERT' 
        ? 'approval.requested' 
        : 'approval.decided';
      this.emit(kind, payload);
    });

    await new Promise<void>((resolve, reject) => {
      this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(\`Realtime channel failed: \${status}\`));
        }
      });
    });
  }

  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.handlers.clear();
    this.globalHandlers.clear();
  }

  private attachTableListener(
    schema: string,
    table: string,
    onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  ): void {
    if (!this.channel) return;

    const filter = table === 'memories' || table === 'human_approvals'
      ? undefined
      : \`mission_id=eq.\${this.missionId}\`;

    this.channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema,
        table,
        ...(filter ? { filter } : {}),
      },
      onChange as any
    );
  }

  private emit(
    kind: RealtimeEventKind,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): void {
    const row = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;

    const event: RealtimeEvent = {
      kind,
      mission_id: (row['mission_id'] as string) ?? this.missionId,
      organization_id: this.organizationId,
      timestamp: new Date().toISOString(),
      payload: row,
      raw_change: {
        schema: (payload as any).schema ?? 'unknown',
        table: (payload as any).table ?? 'unknown',
        event_type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      },
    };

    const targetedHandlers = this.handlers.get(kind);
    if (targetedHandlers) {
      for (const handler of targetedHandlers) {
        try {
          void handler(event);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(\`[coco/realtime] Handler error for \${kind}:\`, err);
        }
      }
    }

    for (const handler of this.globalHandlers) {
      try {
        void handler(event);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(\`[coco/realtime] Global handler error for \${kind}:\`, err);
      }
    }
  }

  private classifyMissionEvent(
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): RealtimeEventKind {
    if (payload.eventType === 'INSERT') return 'mission.updated';
    const oldRow = (payload.old ?? {}) as Record<string, unknown>;
    const newRow = (payload.new ?? {}) as Record<string, unknown>;
    if (oldRow['phase'] !== newRow['phase']) {
      if (newRow['phase'] === 'completed' || newRow['phase'] === 'failed') {
        return 'mission.completed';
      }
      return 'mission.phase_changed';
    }
    return 'mission.updated';
  }

  private classifyTaskEvent(
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): RealtimeEventKind {
    if (payload.eventType === 'INSERT') return 'task.created';
    const oldRow = (payload.old ?? {}) as Record<string, unknown>;
    const newRow = (payload.new ?? {}) as Record<string, unknown>;
    if (newRow['status'] === 'completed' && oldRow['status'] !== 'completed') {
      return 'task.completed';
    }
    return 'task.status_changed';
  }

  private classifyAgentEvent(
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): RealtimeEventKind {
    if (payload.eventType === 'INSERT') return 'agent.spawned';
    const newRow = (payload.new ?? {}) as Record<string, unknown>;
    if (newRow['status'] === 'retired' || newRow['status'] === 'completed') {
      return 'agent.retired';
    }
    return 'agent.spawned';
  }
}
`,

  'packages/coco-realtime/src/channels/organization-channel.ts': `import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { RealtimeEvent, RealtimeEventKind, EventHandler } from '../types/index';

/**
 * OrganizationChannel subscribes to a subset of mission-affecting events across
 * ALL missions belonging to an organization. Used for org-wide dashboards.
 */
export class OrganizationChannel {
  private channel: RealtimeChannel | null = null;
  private handlers = new Map<RealtimeEventKind, Set<EventHandler>>();

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly organizationId: string
  ) {}

  on<T = Record<string, unknown>>(kind: RealtimeEventKind, handler: EventHandler<T>): this {
    if (!this.handlers.has(kind)) {
      this.handlers.set(kind, new Set());
    }
    this.handlers.get(kind)!.add(handler as EventHandler);
    return this;
  }

  async subscribe(): Promise<void> {
    if (this.channel) {
      throw new Error('Channel already subscribed');
    }

    const channelName = \`coco:org:\${this.organizationId}\`;
    this.channel = this.supabase.channel(channelName);

    this.channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'missions',
        table: 'missions',
        filter: \`organization_id=eq.\${this.organizationId}\`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const oldRow = (payload.old ?? {}) as Record<string, unknown>;
        const newRow = (payload.new ?? {}) as Record<string, unknown>;
        let kind: RealtimeEventKind = 'mission.updated';
        if (payload.eventType === 'INSERT') kind = 'mission.updated';
        else if (newRow['phase'] === 'completed' || newRow['phase'] === 'failed') kind = 'mission.completed';
        else if (oldRow['phase'] !== newRow['phase']) kind = 'mission.phase_changed';
        this.emit(kind, payload);
      }
    );

    this.channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'security',
        table: 'human_approvals',
        filter: \`organization_id=eq.\${this.organizationId}\`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const kind: RealtimeEventKind = payload.eventType === 'INSERT' 
          ? 'approval.requested' 
          : 'approval.decided';
        this.emit(kind, payload);
      }
    );

    await new Promise<void>((resolve, reject) => {
      this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(\`Realtime channel failed: \${status}\`));
        }
      });
    });
  }

  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.handlers.clear();
  }

  private emit(
    kind: RealtimeEventKind,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): void {
    const row = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;

    const event: RealtimeEvent = {
      kind,
      mission_id: row['mission_id'] as string | undefined,
      organization_id: this.organizationId,
      timestamp: new Date().toISOString(),
      payload: row,
      raw_change: {
        schema: (payload as any).schema ?? 'unknown',
        table: (payload as any).table ?? 'unknown',
        event_type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      },
    };

    const handlers = this.handlers.get(kind);
    if (handlers) {
      for (const handler of handlers) {
        try {
          void handler(event);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(\`[coco/realtime] Handler error for \${kind}:\`, err);
        }
      }
    }
  }
}
`,

  'packages/coco-billing/src/metering/hooks.ts': `import type { SupabaseClient } from '@supabase/supabase-js';
import { UsageTracker } from './tracker';
import { TierEnvelopeGuard } from './tier-guard';

/**
 * Helpers for API routes / executors to enforce tier + record usage
 * without importing billing into every fabric package at construct time.
 */
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
`,

  'packages/coco-billing/src/metering/tracker.ts': `import type { SupabaseClient } from '@supabase/supabase-js';
import { UsageMeter } from './index';
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

/**
 * UsageTracker — single entrypoint for fabrics to record billable events
 * and optionally fire budget-warning emails at 50/75/90%.
 */
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
`,
};

for (const [path, content] of Object.entries(files)) {
  fs.writeFileSync(path, content, 'utf8');
  console.log(`Cleaned: ${path}`);
}
console.log('All corrupted files restored with pristine code.');
