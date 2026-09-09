import { z } from 'zod';
import { MissionPhase, AutonomyLevel } from './enums';

export { AutonomyLevel };

export const DegradedModeKind = z.enum([
  'continue_low_risk_only',
  'checkpoint_and_wait',
  'abort_mission',
  'rollback_to_checkpoint',
]);
export type DegradedModeKind = z.infer<typeof DegradedModeKind>;

export const StopConditionKind = z.enum([
  'budget_exhausted',
  'wall_time_exceeded',
  'verification_repeatedly_failing',
  'drift_detected',
  'external_signal',
  'safety_incident',
  'deliverable_met',
]);
export type StopConditionKind = z.infer<typeof StopConditionKind>;

export const MissionCharterSchema = z.object({
  charter_id: z.string(),
  mission_id: z.string(),
  organization_id: z.string(),
  
  authorized_by_user_id: z.string(),
  authorization_reason: z.string().optional(),
  authorized_at_unix_ms: z.number(),
  charter_signature: z.string(),

  objective: z.string(),
  success_criteria: z.array(z.string()).default([]),
  explicit_exclusions: z.array(z.string()).default([]),
  
  scope: z.object({
    allowed_tools: z.array(z.string()).default([]),
    forbidden_tools: z.array(z.string()).default([]),
    allowed_data_scopes: z.array(z.string()).default([]),
    forbidden_data_scopes: z.array(z.string()).default([]),
    allowed_domains: z.array(z.string()).default([]),
    may_spawn_dynamic_agents: z.boolean().default(true),
    may_modify_project_brain: z.boolean().default(true),
    may_produce_external_outputs: z.boolean().default(false),
  }),

  tier: z.enum(['default', 'pro', 'ranger', 'enterprise']).default('ranger'),
  autonomy_level: AutonomyLevel.default('l3_multistep'),
  
  budget: z.object({
    max_compute_seconds: z.number().default(3600),
    max_wall_clock_seconds: z.number().default(86400),
    max_parallel_agents: z.number().default(4),
    max_model_tokens_total: z.number().default(1000000),
    max_cost_usd: z.number().default(10.0),
  }),

  degraded_mode: z.object({
    on_approver_unreachable: DegradedModeKind.default('checkpoint_and_wait'),
    on_budget_warning: DegradedModeKind.default('continue_low_risk_only'),
    on_provider_outage: DegradedModeKind.default('checkpoint_and_wait'),
    on_drift_detected: DegradedModeKind.default('checkpoint_and_wait'),
  }),
});
export type MissionCharter = z.infer<typeof MissionCharterSchema>;

export const CheckpointTrigger = z.enum([
  'scheduled_interval',
  'phase_transition',
  'approval_requested',
  'risk_gate',
  'drift_detected',
  'budget_warning',
  'manual',
  'pre_stop',
  'pre_handoff',
]);
export type CheckpointTrigger = z.infer<typeof CheckpointTrigger>;

export const RangerCheckpointSchema = z.object({
  checkpoint_id: z.string(),
  mission_id: z.string(),
  checkpoint_number: z.number().int(),
  prev_checkpoint_id: z.string().optional(),
  chain_hash: z.string(),
  trigger: CheckpointTrigger,
  created_at: z.string(),
  
  state_snapshot: z.object({
    phase: MissionPhase,
    active_task_ids: z.array(z.string()),
    completed_task_ids: z.array(z.string()),
    failed_task_ids: z.array(z.string()),
    usage: z.record(z.number()),
  }),
  
  full_snapshot_uri: z.string(),
  signature: z.string(),
});
export type RangerCheckpoint = z.infer<typeof RangerCheckpointSchema>;

export const SignalKind = z.enum([
  'pause',
  'resume',
  'stop_graceful',
  'stop_immediate',
  'adjust_parallelism',
  'adjust_budget',
  'amend_charter',
  'force_checkpoint',
  'hand_off',
]);
export type SignalKind = z.infer<typeof SignalKind>;

export const MissionControlSignalSchema = z.object({
  signal_id: z.string(),
  mission_id: z.string(),
  kind: SignalKind,
  issued_by_user_id: z.string(),
  reason: z.string().optional(),
  params: z.record(z.unknown()).default({}),
  issued_at_unix_ms: z.number(),
});
export type MissionControlSignal = z.infer<typeof MissionControlSignalSchema>;
