import { CocoEvent } from '@coco/protocol';
import { prefixedId, hashJson, nowUnixMs } from '@coco/common';
import type { EmitEventInput, EventLogStore, EventStreamPublisher } from './types';

/**
 * The COCO Event Bus.
 *
 * Dual-write:
 *   1. Durable Postgres event_log (source of truth, replayable)
 *   2. Optional Redis Stream (real-time fan-out for live UIs)
 *
 * Every event gets a monotonic sequence_number per mission for ordered replay.
 */
export class EventBus {
  constructor(
    private readonly store: EventLogStore,
    private readonly stream?: EventStreamPublisher,
  ) {}

  async emit(input: EmitEventInput): Promise<CocoEvent> {
    const event_id = prefixedId('event');
    const occurred_at_unix_ms = nowUnixMs();

    const sequence_number = input.mission_id
      ? await this.store.nextSequence(input.mission_id)
      : 0;

    const data = input.data ?? {};
    const metadata = input.metadata ?? {};

    const payload_hash = await hashJson({
      event_id,
      event_type: input.event_type,
      data,
      metadata,
      occurred_at_unix_ms,
    });

    const event: CocoEvent = {
      event_id,
      event_type: input.event_type,
      event_schema_version: 1,
      actor_kind: input.actor_kind,
      actor_id: input.actor_id,
      subject_kind: input.subject_kind,
      subject_id: input.subject_id,
      data,
      metadata,
      occurred_at_unix_ms,
      sequence_number,
      organization_id: input.organization_id,
      mission_id: input.mission_id,
      run_id: input.run_id,
      task_id: input.task_id,
      correlation_id: input.correlation_id,
      causation_id: input.causation_id,
      emitter_fabric: input.emitter_fabric,
      emitter_component: input.emitter_component,
      sensitivity: input.sensitivity ?? 'internal',
      payload_hash,
    };

    // Durable write first
    await this.store.insert(event);

    // Best-effort realtime fan-out (never fails the emit)
    if (this.stream && input.mission_id) {
      try {
        const streamKey = `coco:mission:${input.mission_id}:events`;
        await this.stream.publish(streamKey, event);
      } catch (err) {
        console.error('[EventBus] stream publish failed (non-fatal):', err);
      }
    }

    return event;
  }

  async getMissionTimeline(missionId: string, afterSequence = 0, limit = 200): Promise<CocoEvent[]> {
    return this.store.fetchByMission(missionId, afterSequence, limit);
  }

  async getOrgRecent(organizationId: string, limit = 50): Promise<CocoEvent[]> {
    return this.store.fetchByOrg(organizationId, limit);
  }
}
