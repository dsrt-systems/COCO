/**
 * Canonical set of realtime event categories emitted across the mission lifecycle.
 * Consumers subscribe by kind and receive typed payloads.
 */

export type RealtimeEventKind =
  | 'mission.updated'
  | 'mission.phase_changed'
  | 'mission.completed'
  | 'task.created'
  | 'task.status_changed'
  | 'task.completed'
  | 'agent.spawned'
  | 'agent.retired'
  | 'agent.run_started'
  | 'agent.run_completed'
  | 'agent.finding_recorded'
  | 'model.call_completed'
  | 'tool.call_completed'
  | 'sandbox.allocated'
  | 'sandbox.released'
  | 'verification.started'
  | 'verification.level_passed'
  | 'verification.level_failed'
  | 'verification.completed'
  | 'critic.report_emitted'
  | 'repair.order_issued'
  | 'memory.written'
  | 'decision.recorded'
  | 'approval.requested'
  | 'approval.decided';

export interface RealtimeEvent<T = Record<string, unknown>> {
  kind: RealtimeEventKind;
  mission_id?: string;
  organization_id: string;
  timestamp: string;
  payload: T;
  raw_change?: {
    schema: string;
    table: string;
    event_type: 'INSERT' | 'UPDATE' | 'DELETE';
  };
}

export interface ChannelSubscription {
  channel_name: string;
  unsubscribe: () => Promise<void>;
}

export type EventHandler<T = Record<string, unknown>> = (event: RealtimeEvent<T>) => void | Promise<void>;

/**
 * Live counter aggregate for mission control UIs.
 * Updated as events stream in.
 */
export interface LiveMissionMetrics {
  mission_id: string;
  active_agents: number;
  completed_runs: number;
  total_tool_calls: number;
  total_model_calls: number;
  total_tokens_input: number;
  total_tokens_output: number;
  total_cost_usd: number;
  verification_passes: number;
  verification_failures: number;
  last_event_at: string;
}
