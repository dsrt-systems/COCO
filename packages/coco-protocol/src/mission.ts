import { z } from 'zod';
import {
  MissionTier,
  MissionPhase,
  TaskKind,
  TaskStatus,
  AutonomyLevel,
  DeliveryMode,
} from './enums';
import { ArtifactRefSchema, Sha256HexSchema } from './shared';

/**
 * Mission Protocol (Deep Spec 2 §2)
 */

export const ConstraintSchema = z.object({
  kind: z.enum(['must', 'must_not', 'budget', 'deadline', 'policy']),
  statement: z.string(),
  severity: z.enum(['info', 'warn', 'error', 'critical']).default('warn'),
});
export type Constraint = z.infer<typeof ConstraintSchema>;

export const ResourceBudgetSchema = z.object({
  max_compute_seconds: z.number().int().nonnegative().optional(),
  max_wall_clock_seconds: z.number().int().nonnegative().optional(),
  max_parallel_agents: z.number().int().positive().optional(),
  max_model_tokens_total: z.number().int().nonnegative().optional(),
  max_tool_calls_total: z.number().int().nonnegative().optional(),
  max_cost_usd: z.number().nonnegative().optional(),
});
export type ResourceBudget = z.infer<typeof ResourceBudgetSchema>;

export const ResourceUsageSchema = z.object({
  compute_seconds_used: z.number().nonnegative().default(0),
  wall_clock_seconds: z.number().nonnegative().default(0),
  model_tokens_used: z.number().int().nonnegative().default(0),
  tool_calls_executed: z.number().int().nonnegative().default(0),
  cost_usd_accrued: z.number().nonnegative().default(0),
});
export type ResourceUsage = z.infer<typeof ResourceUsageSchema>;

export const ContextHintsSchema = z.object({
  preferred_memory_scopes: z.array(z.string()).optional(),
  preferred_sources: z.array(z.string()).optional(),
  exclude_sources: z.array(z.string()).optional(),
  focus_topics: z.array(z.string()).optional(),
});
export type ContextHints = z.infer<typeof ContextHintsSchema>;

export const MissionRequestSchema = z.object({
  mission_id: z.string(),
  project_id: z.string().optional(),
  parent_mission_id: z.string().optional(),

  objective: z.string().min(1),
  normalized_intent: z.string().optional(),
  success_criteria: z.array(z.string()).default([]),
  constraints: z.array(ConstraintSchema).default([]),

  tier: MissionTier,
  cognitive_depth: z.number().int().min(0).max(6).default(2),
  autonomy_level: AutonomyLevel.default('l1_recommend'),
  delivery_mode: DeliveryMode.default('streaming'),
  deliverable_types: z.array(z.string()).default([]),

  budget: ResourceBudgetSchema.default({}),
  input_artifacts: z.array(ArtifactRefSchema).default([]),
  context_hints: ContextHintsSchema.optional(),
});
export type MissionRequest = z.infer<typeof MissionRequestSchema>;

export const MissionStateSchema = z.object({
  mission_id: z.string(),
  phase: MissionPhase,
  current_step: z.string().optional(),

  active_task_ids: z.array(z.string()).default([]),
  completed_task_ids: z.array(z.string()).default([]),
  blocked_task_ids: z.array(z.string()).default([]),
  failed_task_ids: z.array(z.string()).default([]),

  usage: ResourceUsageSchema,
  checkpoints: z
    .array(
      z.object({
        checkpoint_id: z.string(),
        checkpoint_number: z.number().int().positive(),
        checkpoint_hash: Sha256HexSchema,
        created_at_unix_ms: z.number().int().nonnegative(),
      }),
    )
    .default([]),

  started_at_unix_ms: z.number().int().nonnegative().optional(),
  last_updated_unix_ms: z.number().int().nonnegative(),
  estimated_completion_unix_ms: z.number().int().nonnegative().optional(),

  progress_percent: z.number().min(0).max(100).default(0),
  status_summary: z.string().optional(),
});
export type MissionState = z.infer<typeof MissionStateSchema>;

export const TaskSchema = z.object({
  task_id: z.string(),
  mission_id: z.string(),
  parent_task_id: z.string().optional(),
  objective: z.string(),
  kind: TaskKind,

  required_capabilities: z.array(z.string()).default([]),
  preferred_agent_id: z.string().optional(),

  input_refs: z.array(ArtifactRefSchema).default([]),
  expected_outputs: z.array(z.string()).default([]),

  verification_level: z.number().int().min(0).max(10).default(6),
  cognitive_depth: z.number().int().min(0).max(6).default(2),
  task_budget: ResourceBudgetSchema.default({}),

  success_criteria: z.array(z.string()).default([]),
  max_repair_attempts: z.number().int().nonnegative().default(3),
  status: TaskStatus.default('pending'),
  attempt_number: z.number().int().nonnegative().default(0),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskEdgeSchema = z.object({
  from_task_id: z.string(),
  to_task_id: z.string(),
  kind: z.enum(['depends_on', 'feeds', 'triggers', 'conditional']),
  condition_expr: z.string().optional(),
});
export type TaskEdge = z.infer<typeof TaskEdgeSchema>;

export const TaskGraphSchema = z.object({
  mission_id: z.string(),
  graph_id: z.string(),
  graph_version: z.number().int().positive().default(1),
  nodes: z.array(TaskSchema),
  edges: z.array(TaskEdgeSchema),
  critical_path: z.string().optional(),
  created_by_agent: z.string(),
});
export type TaskGraph = z.infer<typeof TaskGraphSchema>;

export const CheckpointRefSchema = z.object({
  checkpoint_id: z.string(),
  checkpoint_number: z.number().int().positive(),
  checkpoint_hash: Sha256HexSchema,
  created_at_unix_ms: z.number().int().nonnegative(),
});
export type CheckpointRef = z.infer<typeof CheckpointRefSchema>;

export const CheckpointSchema = z.object({
  checkpoint_id: z.string(),
  mission_id: z.string(),
  checkpoint_number: z.number().int().positive(),
  checkpoint_hash: Sha256HexSchema,

  state_snapshot: MissionStateSchema,
  graph_snapshot: TaskGraphSchema,
  artifact_refs: z.array(ArtifactRefSchema).default([]),

  reason: z.string(),
  created_at_unix_ms: z.number().int().nonnegative(),
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;
