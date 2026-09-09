import type { CocoEvent } from '@coco/protocol';
import type { EventLogStore, EventStreamPublisher } from '@coco/events';
import { createServiceClient } from '@/lib/supabase/service';
import { Redis } from '@upstash/redis';

/**
 * Postgres-backed durable event log.
 */
export function createEventLogStore(): EventLogStore {
  const supabase = createServiceClient();

  return {
    async nextSequence(missionId: string): Promise<number> {
      // Upsert mission_sequences and return next value atomically via RPC-like pattern.
      // Since we may not have a stored procedure yet, do read-modify-write carefully.
      const { data: existing } = await supabase
        .schema('events')
        .from('mission_sequences')
        .select('next_sequence')
        .eq('mission_id', missionId)
        .maybeSingle();

      if (!existing) {
        await supabase.schema('events').from('mission_sequences').insert({
          mission_id: missionId,
          next_sequence: 2,
        });
        return 1;
      }

      const current = existing.next_sequence as number;
      await supabase
        .schema('events')
        .from('mission_sequences')
        .update({ next_sequence: current + 1 })
        .eq('mission_id', missionId);

      return current;
    },

    async insert(event: CocoEvent): Promise<void> {
      const { error } = await supabase.schema('events').from('event_log').insert({
        event_id: event.event_id,
        organization_id: event.organization_id,
        mission_id: event.mission_id ?? null,
        run_id: event.run_id ?? null,
        task_id: event.task_id ?? null,
        correlation_id: event.correlation_id ?? null,
        causation_id: event.causation_id ?? null,
        event_type: event.event_type,
        event_schema_version: event.event_schema_version,
        sequence_number: event.sequence_number,
        actor_kind: event.actor_kind,
        actor_id: event.actor_id,
        subject_kind: event.subject_kind,
        subject_id: event.subject_id ?? null,
        emitter_fabric: event.emitter_fabric,
        emitter_component: event.emitter_component,
        sensitivity: event.sensitivity,
        data: event.data,
        metadata: event.metadata,
        payload_hash: event.payload_hash,
        occurred_at: new Date(event.occurred_at_unix_ms).toISOString(),
      });
      if (error) throw error;
    },

    async fetchByMission(missionId: string, afterSequence = 0, limit = 200): Promise<CocoEvent[]> {
      const { data, error } = await supabase
        .schema('events')
        .from('event_log')
        .select('*')
        .eq('mission_id', missionId)
        .gt('sequence_number', afterSequence)
        .order('sequence_number', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToEvent);
    },

    async fetchByOrg(organizationId: string, limit = 50): Promise<CocoEvent[]> {
      const { data, error } = await supabase
        .schema('events')
        .from('event_log')
        .select('*')
        .eq('organization_id', organizationId)
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToEvent);
    },
  };
}

function rowToEvent(row: any): CocoEvent {
  return {
    event_id: row.event_id,
    event_type: row.event_type,
    event_schema_version: row.event_schema_version,
    actor_kind: row.actor_kind,
    actor_id: row.actor_id,
    subject_kind: row.subject_kind,
    subject_id: row.subject_id ?? undefined,
    data: row.data ?? {},
    metadata: row.metadata ?? {},
    occurred_at_unix_ms: new Date(row.occurred_at).getTime(),
    sequence_number: row.sequence_number,
    organization_id: row.organization_id,
    mission_id: row.mission_id ?? undefined,
    run_id: row.run_id ?? undefined,
    task_id: row.task_id ?? undefined,
    correlation_id: row.correlation_id ?? undefined,
    causation_id: row.causation_id ?? undefined,
    emitter_fabric: row.emitter_fabric,
    emitter_component: row.emitter_component,
    sensitivity: row.sensitivity,
    payload_hash: row.payload_hash,
  };
}

/**
 * Upstash Redis Streams publisher for real-time fan-out.
 * Gracefully no-ops if Redis env vars are missing.
 */
export function createRedisPublisher(): EventStreamPublisher | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;

  const redis = new Redis({ url, token });

  return {
    async publish(streamKey: string, event: CocoEvent): Promise<void> {
      // Upstash REST supports XADD via .xadd
      await redis.xadd(streamKey, '*', {
        event_id: event.event_id,
        event_type: event.event_type,
        mission_id: event.mission_id ?? '',
        sequence_number: String(event.sequence_number),
        payload: JSON.stringify(event),
      });
      // Cap stream length to last 1000 events per mission
      try {
        await redis.xtrim(streamKey, { strategy: 'MAXLEN', threshold: 1000, exactness: '~' });
      } catch {
        // xtrim is best-effort
      }
    },
  };
}
