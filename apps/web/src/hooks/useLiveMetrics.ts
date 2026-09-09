import { useEffect, useState, useRef } from 'react';
import { MetricsAggregator, LiveMissionMetrics, RealtimeEvent } from '@coco/realtime';

export function useLiveMetrics(missionId: string) {
  const [metrics, setMetrics] = useState<LiveMissionMetrics>({
    mission_id: missionId,
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
  });

  const aggregatorRef = useRef<MetricsAggregator | null>(null);

  useEffect(() => {
    if (!aggregatorRef.current) {
      aggregatorRef.current = new MetricsAggregator({
        mission_id: missionId,
        onUpdate: (newMetrics) => {
          setMetrics(newMetrics);
        },
      });
    }
  }, [missionId]);

  // Expose a function to feed events into the aggregator
  const feedEvent = (event: RealtimeEvent) => {
    aggregatorRef.current?.handle(event);
  };

  return { metrics, feedEvent };
}
