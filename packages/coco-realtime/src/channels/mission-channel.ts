import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { RealtimeEvent, RealtimeEventKind, EventHandler } from '../types/index.js';

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

  /**
   * Register a handler for a specific event kind.
   */
  on<T = Record<string, unknown>>(kind: RealtimeEventKind, handler: EventHandler<T>): this {
    if (!this.handlers.has(kind)) {
      this.handlers.set(kind, new Set());
    }
    this.handlers.get(kind)!.add(handler as EventHandler);
    return this;
  }

  /**
   * Register a handler for ALL events on this channel.
   */
  onAny(handler: EventHandler): this {
    this.globalHandlers.add(handler);
    return this;
  }

  /**
   * Open the WebSocket subscription. Must be called after registering handlers.
   */
  async subscribe(): Promise<void> {
    if (this.channel) {
      throw new Error('Channel already subscribed');
    }

    const channelName = `coco:mission:${this.missionId}`;
    this.channel = this.supabase.channel(channelName);

    // Subscribe to each fabric table filtered by mission_id
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

    // Open the WebSocket
    await new Promise<void>((resolve, reject) => {
      this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Realtime channel failed: ${status}`));
        }
      });
    });
  }

  /**
   * Close the WebSocket subscription and release resources.
   */
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

    // Filter by mission_id where the column exists
    const filter = table === 'memories' || table === 'human_approvals'
      ? undefined
      : `mission_id=eq.${this.missionId}`;

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

    // Fire targeted handlers
    const targetedHandlers = this.handlers.get(kind);
    if (targetedHandlers) {
      for (const handler of targetedHandlers) {
        try {
          void handler(event);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[coco/realtime] Handler error for ${kind}:`, err);
        }
      }
    }

    // Fire global handlers
    for (const handler of this.globalHandlers) {
      try {
        void handler(event);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[coco/realtime] Global handler error for ${kind}:`, err);
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
