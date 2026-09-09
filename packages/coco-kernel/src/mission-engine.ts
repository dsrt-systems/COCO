import type { MissionPhase, MissionRequest } from '@coco/protocol';
import { EVENT_TYPES } from '@coco/protocol';
import { prefixedId, nowUnixMs, nowIso } from '@coco/common';
import type { EventBus } from '@coco/events';
import {
  assertTransition,
  progressFor,
  summaryFor,
  isTerminal,
  BOOTSTRAP_PATH,
} from './state-machine';
import type { CreateMissionInput, MissionRecord, MissionStore } from './types';

/**
 * The Mission Engine — heart of the Kernel Fabric.
 *
 * Responsibilities:
 *   - Create missions
 *   - Drive phase transitions
 *   - Emit canonical events for every state change
 *   - Provide mission queries
 *
 * Phase 4 implements create + bootstrap progression.
 * Later phases plug in real agents at each phase.
 */
export class MissionEngine {
  constructor(
    private readonly store: MissionStore,
    private readonly bus: EventBus,
  ) {}

  async create(input: CreateMissionInput): Promise<MissionRecord> {
    const mission_id = prefixedId('mission');
    const now = nowIso();

    const mission: MissionRecord = {
      mission_id,
      organization_id: input.organization_id,
      project_id: input.project_id ?? null,
      parent_mission_id: null,
      created_by: input.created_by,
      objective: input.objective,
      normalized_intent: null,
      success_criteria: input.success_criteria ?? [],
      constraints: input.constraints ?? [],
      tier: input.tier ?? 'default',
      cognitive_depth: input.cognitive_depth ?? 2,
      autonomy_level: input.autonomy_level ?? 'l1_recommend',
      delivery_mode: input.delivery_mode ?? 'streaming',
      deliverable_types: input.deliverable_types ?? [],
      budget: input.budget ?? {},
      usage: {
        compute_seconds_used: 0,
        wall_clock_seconds: 0,
        model_tokens_used: 0,
        tool_calls_executed: 0,
        cost_usd_accrued: 0,
      },
      phase: 'created',
      current_step: 'S0',
      progress_percent: 0,
      status_summary: summaryFor('created'),
      started_at: null,
      last_activity_at: now,
      estimated_completion_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };

    await this.store.insert(mission);

    await this.bus.emit({
      event_type: EVENT_TYPES.MISSION_CREATED,
      organization_id: mission.organization_id,
      actor_kind: 'user',
      actor_id: mission.created_by,
      subject_kind: 'mission',
      subject_id: mission.mission_id,
      emitter_fabric: 'kernel',
      emitter_component: 'mission_engine',
      mission_id: mission.mission_id,
      data: {
        objective: mission.objective,
        tier: mission.tier,
        cognitive_depth: mission.cognitive_depth,
        autonomy_level: mission.autonomy_level,
      },
    });

    return mission;
  }

  async get(missionId: string): Promise<MissionRecord | null> {
    return this.store.findById(missionId);
  }

  async list(organizationId: string, limit = 20): Promise<MissionRecord[]> {
    return this.store.listByOrg(organizationId, limit);
  }

  /**
   * Transition a mission to a new phase. Validates the transition,
   * updates state, emits the appropriate event.
   */
  async transition(
    missionId: string,
    to: MissionPhase,
    actor: { kind: 'user' | 'agent' | 'system'; id: string },
    data?: Record<string, unknown>,
  ): Promise<MissionRecord> {
    const current = await this.store.findById(missionId);
    if (!current) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    assertTransition(current.phase, to);

    const extras: Parameters<MissionStore['updatePhase']>[2] = {
      progress_percent: progressFor(to),
      status_summary: summaryFor(to),
      current_step: `phase:${to}`,
    };

    if (to === 'understanding' && !current.started_at) {
      extras.started_at = nowIso();
    }
    if (isTerminal(to)) {
      extras.completed_at = nowIso();
    }

    const updated = await this.store.updatePhase(missionId, to, extras);

    // Map phase → canonical event type
    const eventType = phaseToEventType(to);

    await this.bus.emit({
      event_type: eventType,
      organization_id: updated.organization_id,
      actor_kind: actor.kind,
      actor_id: actor.id,
      subject_kind: 'mission',
      subject_id: missionId,
      emitter_fabric: 'kernel',
      emitter_component: 'mission_engine',
      mission_id: missionId,
      data: {
        from_phase: current.phase,
        to_phase: to,
        progress_percent: updated.progress_percent,
        ...data,
      },
    });

    return updated;
  }

  /**
   * Bootstrap runner: walks a mission through the happy path with
   * simulated dwell times. Used in Phase 4 before real agents exist.
   * Each phase emits real events so the timeline UI is fully functional.
   */
  async runBootstrap(
    missionId: string,
    options?: { delayMs?: number; actorId?: string },
  ): Promise<MissionRecord> {
    const delayMs = options?.delayMs ?? 800;
    const actorId = options?.actorId ?? 'system:bootstrap';

    let mission = await this.store.findById(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    for (const phase of BOOTSTRAP_PATH) {
      if (isTerminal(mission.phase)) break;
      if (mission.phase === phase) continue;

      // Only transition if valid from current
      try {
        mission = await this.transition(missionId, phase, { kind: 'system', id: actorId });
      } catch {
        // Skip invalid — find next valid
        break;
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }

    return mission;
  }
}

function phaseToEventType(phase: MissionPhase): string {
  const map: Record<string, string> = {
    understanding: EVENT_TYPES.MISSION_UNDERSTANDING_STARTED,
    challenging: EVENT_TYPES.MISSION_CHALLENGED,
    researching: EVENT_TYPES.MISSION_UNDERSTANDING_COMPLETED, // closest
    planning: EVENT_TYPES.MISSION_PLANNED,
    organizing: EVENT_TYPES.MISSION_ORGANIZED,
    executing: EVENT_TYPES.MISSION_EXECUTING_STARTED,
    verifying: EVENT_TYPES.MISSION_VERIFIED,
    repairing: EVENT_TYPES.MISSION_REPAIRING_STARTED,
    refining: EVENT_TYPES.MISSION_REPAIR_COMPLETED,
    delivering: EVENT_TYPES.MISSION_DELIVERING_STARTED,
    remembering: EVENT_TYPES.MISSION_DELIVERING_STARTED,
    completed: EVENT_TYPES.MISSION_COMPLETED,
    cancelled: EVENT_TYPES.MISSION_CANCELLED,
    failed: EVENT_TYPES.MISSION_FAILED,
  };
  return map[phase] ?? `mission.phase.${phase}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
