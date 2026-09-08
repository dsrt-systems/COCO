import { z } from 'zod';
import { AgentTier, RunOutcome, EpistemicStatus, MemoryScope, ToolScope, AccessMode } from './enums';
import {
  ArtifactRefSchema,
  ContextPacketRefSchema,
  ModelCallRefSchema,
  ToolCallRefSchema,
  DecisionRefSchema,
  MemoryRefSchema,
  EvidenceRefSchema,
  ConfidenceScoreSchema,
} from './shared';
import { ResourceBudgetSchema, ResourceUsageSchema } from './mission';

/**
 * Agent Protocol (Deep Spec 2 §3)
 */

export const ToolGrantSchema = z.object({
  tool_id: z.string(),
  scope: ToolScope,
  max_invocations: z.number().int().positive().default(10),
  grant_ttl_seconds: z.number().int().positive().default(3600),
});
export type ToolGrant = z.infer<typeof ToolGrantSchema>;

export const MemoryScopeGrantSchema = z.object({
  scope: MemoryScope,
  mode: AccessMode,
});
export type MemoryScopeGrant = z.infer<typeof MemoryScopeGrantSchema>;

export const ModelPreferencesSchema = z.object({
  preferred_models: z.array(z.string()).default([]),
  excluded_models: z.array(z.string()).default([]),
  minimum_tier: z.string().optional(),
  min_context_tokens: z.number().int().nonnegative().optional(),
  requires_tool_calling: z.boolean().default(false),
  requires_vision: z.boolean().default(false),
  requires_json_mode: z.boolean().default(false),
  allows_streaming: z.boolean().default(true),
});
export type ModelPreferences = z.infer<typeof ModelPreferencesSchema>;

export const DynamicAgentSpecSchema = z.object({
  domain: z.string(),
  knowledge_sources: z.array(z.string()).default([]),
  methodology_framework: z.string(),
  methodology_steps: z.array(z.string()),
  system_prompt_template: z.string(),
});
export type DynamicAgentSpec = z.infer<typeof DynamicAgentSpecSchema>;

export const AgentSpawnRequestSchema = z.object({
  spawn_id: z.string(),
  mission_id: z.string(),
  task_id: z.string().optional(),
  requesting_agent_id: z.string().optional(),

  agent_definition_id: z.string(),
  dynamic_spec: DynamicAgentSpecSchema.optional(),

  initial_context: ContextPacketRefSchema.optional(),
  tool_grants: z.array(ToolGrantSchema).default([]),
  memory_grants: z.array(MemoryScopeGrantSchema).default([]),
  model_preferences: ModelPreferencesSchema.default({}),

  budget: ResourceBudgetSchema.default({}),
  deadline_unix_ms: z.number().int().nonnegative().optional(),
  critic_agent_id: z.string().optional(),
});
export type AgentSpawnRequest = z.infer<typeof AgentSpawnRequestSchema>;

export const AgentIdentitySchema = z.object({
  agent_id: z.string(),
  display_name: z.string(),
  tier: AgentTier,
  domain: z.string(),
  version: z.string(),
});
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;

export const AgentAssignmentSchema = z.object({
  assignment_id: z.string(),
  agent_instance_id: z.string(),
  agent_definition_id: z.string(),
  task_id: z.string(),
  mission_id: z.string(),
  identity: AgentIdentitySchema,
  assigned_at_unix_ms: z.number().int().nonnegative(),
  assignment_expiry_unix_ms: z.number().int().nonnegative().optional(),
  assigned_by: z.string(),
});
export type AgentAssignment = z.infer<typeof AgentAssignmentSchema>;

export const FindingSchema = z.object({
  finding_id: z.string(),
  claim: z.string(),
  status: EpistemicStatus,
  confidence: ConfidenceScoreSchema,
  evidence_refs: z.array(z.string()).default([]),
  contradicts_refs: z.array(z.string()).default([]),
});
export type Finding = z.infer<typeof FindingSchema>;

export const ConfidenceReportSchema = z.object({
  overall_confidence: ConfidenceScoreSchema,
  reasoning: z.string(),
  caveats: z.array(z.string()).default([]),
  requires_human_review: z.boolean().default(false),
});
export type ConfidenceReport = z.infer<typeof ConfidenceReportSchema>;

export const AgentRunReportSchema = z.object({
  run_id: z.string(),
  agent_instance_id: z.string(),
  task_id: z.string(),
  mission_id: z.string(),

  outcome: RunOutcome,
  outcome_summary: z.string(),

  findings: z.array(FindingSchema).default([]),
  artifacts_produced: z.array(ArtifactRefSchema).default([]),
  decisions_recorded: z.array(DecisionRefSchema).default([]),
  memories_written: z.array(MemoryRefSchema).default([]),
  evidence_gathered: z.array(EvidenceRefSchema).default([]),

  model_calls: z.array(ModelCallRefSchema).default([]),
  tool_calls: z.array(ToolCallRefSchema).default([]),
  assumptions_made: z.array(z.string()).default([]),
  open_questions: z.array(z.string()).default([]),

  confidence: ConfidenceReportSchema,
  usage: ResourceUsageSchema,
  next_recommended_tasks: z.array(z.string()).default([]),

  started_at_unix_ms: z.number().int().nonnegative(),
  completed_at_unix_ms: z.number().int().nonnegative(),
});
export type AgentRunReport = z.infer<typeof AgentRunReportSchema>;

export const AgentControlSignalSchema = z.object({
  signal_id: z.string(),
  agent_instance_id: z.string(),
  kind: z.enum([
    'pause',
    'resume',
    'cancel',
    'escalate',
    'budget_revise',
    'context_refresh',
    'permission_revoke',
  ]),
  reason: z.string(),
  issued_by: z.string(),
});
export type AgentControlSignal = z.infer<typeof AgentControlSignalSchema>;
