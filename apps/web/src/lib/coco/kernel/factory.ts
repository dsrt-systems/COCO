import { EventBus } from '@coco/events';
import { MissionEngine } from '@coco/kernel';
import { createEventLogStore, createRedisPublisher } from '@/lib/coco/events/store';
import { createMissionStore } from '@/lib/coco/kernel/store';

/**
 * Build a fully-wired MissionEngine for server-side use.
 * Call once per request (or cache per-isolate if desired).
 */
export function createMissionEngine(): MissionEngine {
  const eventStore = createEventLogStore();
  const publisher = createRedisPublisher();
  const bus = new EventBus(eventStore, publisher);
  const missionStore = createMissionStore();
  return new MissionEngine(missionStore, bus);
}

export function createEventBus(): EventBus {
  return new EventBus(createEventLogStore(), createRedisPublisher());
}
