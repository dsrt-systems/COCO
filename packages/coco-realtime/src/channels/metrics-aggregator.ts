import type { LiveMissionMetrics, RealtimeEvent } from '../types/index.js';

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

    // Notify subscriber with a fresh copy
    this.options.onUpdate({ ...this.metrics });
  }

  snapshot(): LiveMissionMetrics {
    return { ...this.metrics };
  }
}
