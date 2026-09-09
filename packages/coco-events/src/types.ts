import type { CocoEvent, Sensitivity } from '@coco/protocol';

/**
 * Persistence interface for the durable event log (Postgres events.event_log).
 * Implemented by the web app with Supabase service client.
 */
export interface EventLogStore {
  /** Atomically allocate the next sequence number for a mission. */
  nextSequence(missionId: string): Promise<number>;

  /** Insert a fully-formed event into the durable log. */
  insert(event: CocoEvent): Promise<void>;

  /** Fetch events for a mission ordered by sequence_number ascending. */
  fetchByMission(missionId: string, afterSequence?: number, limit?: number): Promise<CocoEvent[]>;

  /** Fetch recent events for an organization. */
  fetchByOrg(organizationId: string, limit?: number): Promise<CocoEvent[]>;
}

/**
 * Optional Redis Streams publisher for real-time fan-out.
 * If unavailable, the system still works via Postgres polling.
 */
export interface EventStreamPublisher {
  publish(streamKey: string, event: CocoEvent): Promise<void>;
}

export interface EmitEventInput {
  event_type: string;
  organization_id: string;
  actor_kind: 'agent' | 'user' | 'system' | 'external';
  actor_id: string;
  subject_kind: string;
  subject_id?: string;
  emitter_fabric: string;
  emitter_component: string;
  mission_id?: string;
  run_id?: string;
  task_id?: string;
  correlation_id?: string;
  causation_id?: string;
  sensitivity?: Sensitivity;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
