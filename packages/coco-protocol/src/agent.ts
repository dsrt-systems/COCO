import { z } from 'zod';
import { AgentTier, EpistemicStatus, MemoryScope, RunOutcome, ToolScope } from './enums';

export { AgentTier, EpistemicStatus, RunOutcome, ToolScope };

export const AgentToolRequirement = z.object({
  tool_id: z.string(),
  scope: ToolScope,
  is_required: z.boolean().default(true),
});
export type AgentToolRequirement = z.infer<typeof AgentToolRequirement>;

export const ModelProfile = z.object({
  reasoning_model: z.string(),
  fallback_models: z.array(z.string()).default([]),
  temperature: z.number().min(0).max(1).default(0.0),
  max_context_tokens: z.number().int().default(128000),
});
export type ModelProfile = z.infer<typeof ModelProfile>;

export const AgentConstraints = z.object({
  must_rules: z.array(z.string()).default([]),
  must_not_rules: z.array(z.string()).default([]),
  requires_human_approval: z.array(z.string()).default([]),
});
export type AgentConstraints = z.infer<typeof AgentConstraints>;

export const EvaluationRubric = z.object({
  metrics: z.record(z.number()).default({}),
  rejection_threshold: z.number().min(0).max(1).default(0.85),
});
export type EvaluationRubric = z.infer<typeof EvaluationRubric>;

export const AgentDefinitionContract = z.object({
  agent_id: z.string().regex(/^[A-Z][0-9]+_[a-z0-9_]+$/),
  name: z.string(),
  version: z.string().default('1.0.0'),
  tier: AgentTier,
  domain: z.string(),
  reports_to: z.string().nullable().optional(),

  expert_beating_thesis: z.string(),
  model_profile: ModelProfile,
  knowledge_sources: z.array(z.string()).default([]),
  tool_suite: z.array(AgentToolRequirement).default([]),

  system_prompt_template: z.string(),
  methodology_framework: z.string(),
  methodology_steps: z.array(z.string()).min(1),

  constraints: AgentConstraints,
  critic_agent_id: z.string().nullable().optional(),
  evaluation_rubric: EvaluationRubric,

  allowed_memory_scopes: z.array(MemoryScope).default([]),
  is_dynamic: z.boolean().default(false),
});
export type AgentDefinitionContract = z.infer<typeof AgentDefinitionContract>;

export const AgentSpawnRequest = z.object({
  mission_id: z.string(),
  task_id: z.string().optional(),
  requesting_agent_id: z.string().optional(),
  agent_definition_id: z.string(),
  initial_context_ref: z.string().optional(),
  model_preferences: z.record(z.unknown()).optional(),
  budget: z.record(z.unknown()).optional(),
});
export type AgentSpawnRequest = z.infer<typeof AgentSpawnRequest>;

export const AgentInstanceRecord = z.object({
  agent_instance_id: z.string(),
  organization_id: z.string(),
  mission_id: z.string(),
  agent_definition_id: z.string(),
  requesting_agent_id: z.string().nullable().optional(),
  status: z.enum(['spawned', 'running', 'paused', 'completed', 'failed', 'retired']),
  spawned_at: z.string(),
  retired_at: z.string().nullable().optional(),
});
export type AgentInstanceRecord = z.infer<typeof AgentInstanceRecord>;

export const FindingRecord = z.object({
  finding_id: z.string(),
  claim: z.string(),
  epistemic_status: EpistemicStatus,
  confidence: z.number().min(0).max(1),
  evidence_refs: z.array(z.string()).default([]),
  contradicts_refs: z.array(z.string()).default([]),
});
export type FindingRecord = z.infer<typeof FindingRecord>;
export const FindingSchema = FindingRecord;

export const AgentRunReport = z.object({
  run_id: z.string(),
  agent_instance_id: z.string(),
  task_id: z.string(),
  mission_id: z.string(),
  agent_definition_id: z.string(),

  outcome: RunOutcome,
  outcome_summary: z.string(),

  findings: z.array(FindingRecord).default([]),
  artifacts_produced: z.array(z.string()).default([]),
  decisions_recorded: z.array(z.string()).default([]),
  memories_written: z.array(z.string()).default([]),

  confidence_overall: z.number().min(0).max(1),
  confidence_reasoning: z.string(),
  caveats: z.array(z.string()).default([]),
  requires_human_review: z.boolean().default(false),

  assumptions_made: z.array(z.string()).default([]),
  open_questions: z.array(z.string()).default([]),
  next_recommended_tasks: z.array(z.string()).default([]),

  started_at: z.string(),
  completed_at: z.string(),
});
export type AgentRunReport = z.infer<typeof AgentRunReport>;
