import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { RealtimeEvent, RealtimeEventKind, EventHandler } from '../types/index';

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

    const channelName = `coco:org:${this.organizationId}`;
    this.channel = this.supabase.channel(channelName);

    this.channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'missions',
        table: 'missions',
        filter: `organization_id=eq.${this.organizationId}`,
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
        filter: `organization_id=eq.${this.organizationId}`,
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
          reject(new Error(`Realtime channel failed: ${status}`));
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
          console.error(`[coco/realtime] Handler error for ${kind}:`, err);
        }
      }
    }
  }
}
