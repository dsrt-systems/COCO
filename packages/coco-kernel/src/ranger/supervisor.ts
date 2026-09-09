import { prefixedId } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MissionCharter, MissionPhase } from '@coco/protocol';
import { EventBus, type EventLogStore } from '@coco/events';
import { AgentRegistry, AgentRuntimeExecutor } from '@coco/intelligence';
import { AutonomyGate } from './autonomy.js';
import { BudgetEnforcer } from './budget.js';
import { CheckpointManager } from './checkpoint.js';

export interface SupervisorConfig {
  missionId: string;
  organizationId: string;
  charter: MissionCharter;
}

export interface SupervisorRunResult {
  mission_id: string;
  phase: MissionPhase;
  completed_tasks: number;
  checkpoints_taken: number;
  total_cost_usd: number;
}

export class MissionSupervisor {
  private budgetEnforcer: BudgetEnforcer;
  private checkpointManager: CheckpointManager;
  private registry: AgentRegistry;
  private executor: AgentRuntimeExecutor;
  private eventBus: EventBus;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly config: SupervisorConfig
  ) {
    this.budgetEnforcer = new BudgetEnforcer(supabase, config.charter);
    this.checkpointManager = new CheckpointManager(supabase, config.organizationId);
    this.registry = new AgentRegistry(supabase);
    this.executor = new AgentRuntimeExecutor(supabase, this.registry);
    
    // Fully compliant EventLogStore for EventBus
    const store: EventLogStore = {
      nextSequence: async () => 1,
      insert: async (event: any) => {
        await supabase.schema('events').from('event_log').insert({
          event_id: event.event_id,
          organization_id: event.organization_id,
          mission_id: event.mission_id ?? null,
          event_type: event.event_type,
          actor_kind: event.actor_kind,
          actor_id: event.actor_id,
          subject_kind: event.subject_kind,
          subject_id: event.subject_id ?? null,
          emitter_fabric: event.emitter_fabric,
          emitter_component: event.emitter_component,
          data: event.data,
          metadata: event.metadata,
          payload_hash: event.payload_hash ?? '0'.repeat(64),
          occurred_at: new Date(event.occurred_at_unix_ms ?? Date.now()).toISOString(),
        });
      },
      fetchByMission: async () => [],
      fetchByOrg: async () => [],
    };
    this.eventBus = new EventBus(store);
  }

  /**
   * Main Autonomous Execution Loop for Ranger Missions (Deep Spec 10 §3).
   * Advances the mission through phases: CREATED -> PLANNING -> EXECUTING -> VERIFYING -> COMPLETED
   */
  async runMissionLoop(): Promise<SupervisorRunResult> {
    const { missionId } = this.config;
    let checkpointsCount = 0;

    // 1. Initial Checkpoint at start
    await this.checkpointManager.createCheckpoint(missionId, 'phase_transition');
    checkpointsCount++;

    // 2. Phase 1: Planning
    await this.updatePhase(missionId, 'planning');
    
    // Deconstruct mission into tasks in DB
    const tasks = await this.ensureTaskGraph(missionId);

    // 3. Checkpoint post-planning
    await this.checkpointManager.createCheckpoint(missionId, 'phase_transition');
    checkpointsCount++;

    // 4. Phase 2: Executing
    await this.updatePhase(missionId, 'executing');

    let completedTasks = 0;

    for (const task of tasks) {
      // Check budget before each task
      const budgetCheck = await this.budgetEnforcer.evaluate(missionId);
      if (budgetCheck.status === 'exhausted') {
        await this.checkpointManager.createCheckpoint(missionId, 'budget_warning');
        await this.updatePhase(missionId, 'failed');
        throw new Error('Ranger mission budget exhausted');
      }

      // Check autonomy gate for task category
      const gateCheck = AutonomyGate.evaluate(
        task.kind === 'execute' ? 'write_sandbox' : 'read_public',
        this.config.charter.autonomy_level
      );

      if (!gateCheck.allowed) {
        await this.checkpointManager.createCheckpoint(missionId, 'approval_requested');
        // Halt task execution for human approval
        break;
      }

      // Execute task via Agent Runtime
      const agentId = task.preferred_agent_id ?? 'A1_coco_director';
      
      try {
        await this.executor.executeRun({
          mission_id: missionId,
          task_id: task.task_id,
          agent_id: agentId,
          objective: task.objective,
          organization_id: this.config.organizationId,
        });

        // Mark task completed in DB
        await this.supabase
          .schema('missions')
          .from('tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('task_id', task.task_id);

        completedTasks++;
      } catch (err: unknown) {
        // Mark task failed
        await this.supabase
          .schema('missions')
          .from('tasks')
          .update({ status: 'failed', status_reason: (err as Error).message })
          .eq('task_id', task.task_id);
      }
    }

    // 5. Phase 3: Verifying
    await this.updatePhase(missionId, 'verifying');
    await this.checkpointManager.createCheckpoint(missionId, 'phase_transition');
    checkpointsCount++;

    // 6. Phase 4: Completed
    await this.updatePhase(missionId, 'completed');
    await this.checkpointManager.createCheckpoint(missionId, 'scheduled_interval');
    checkpointsCount++;

    const finalBudget = await this.budgetEnforcer.evaluate(missionId);

    return {
      mission_id: missionId,
      phase: 'completed',
      completed_tasks: completedTasks,
      checkpoints_taken: checkpointsCount,
      total_cost_usd: finalBudget.state.cost_usd,
    };
  }

  private async updatePhase(missionId: string, phase: MissionPhase): Promise<void> {
    await this.supabase
      .schema('missions')
      .from('missions')
      .update({
        phase,
        last_activity_at: new Date().toISOString(),
        progress_percent: phase === 'completed' ? 100.0 : phase === 'executing' ? 50.0 : 10.0,
      })
      .eq('mission_id', missionId);

    await this.eventBus.emit({
      event_type: `mission.${phase}`,
      emitter_fabric: 'kernel',
      emitter_component: 'mission_supervisor',
      subject_kind: 'mission',
      subject_id: missionId,
      actor_kind: 'system',
      actor_id: 'mission_supervisor',
      organization_id: this.config.organizationId,
      data: { phase },
    });
  }

  private async ensureTaskGraph(missionId: string): Promise<any[]> {
    const { data: existing } = await this.supabase
      .schema('missions')
      .from('tasks')
      .select('*')
      .eq('mission_id', missionId);

    if (existing && existing.length > 0) return existing;

    const graphId = prefixedId('graph');
    
    await this.supabase.schema('missions').from('task_graphs').insert({
      graph_id: graphId,
      mission_id: missionId,
      graph_version: 1,
      created_by_agent: 'A2_mission_planner',
    });

    const task1Id = prefixedId('task');
    const task2Id = prefixedId('task');

    const tasksToInsert = [
      {
        task_id: task1Id,
        mission_id: missionId,
        graph_id: graphId,
        objective: 'Analyze mission requirements and collect initial context',
        kind: 'research',
        verification_level: 4,
        cognitive_depth: 3,
        status: 'ready',
        preferred_agent_id: 'A1_coco_director',
      },
      {
        task_id: task2Id,
        mission_id: missionId,
        graph_id: graphId,
        parent_task_id: task1Id,
        objective: 'Execute core mission workflow and synthesize deliverable',
        kind: 'execute',
        verification_level: 6,
        cognitive_depth: 4,
        status: 'pending',
        preferred_agent_id: 'A7_synthesis_agent',
      },
    ];

    const { data: inserted } = await this.supabase
      .schema('missions')
      .from('tasks')
      .insert(tasksToInsert)
      .select('*');

    return inserted ?? [];
  }
}
