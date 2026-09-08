import { z } from 'zod';

/**
 * All enums from Deep Spec 3 §1, matching the Postgres enum types exactly.
 */

export const MissionTier = z.enum(['default', 'pro', 'ranger', 'enterprise']);
export type MissionTier = z.infer<typeof MissionTier>;

export const MissionPhase = z.enum([
  'created',
  'understanding',
  'challenging',
  'researching',
  'planning',
  'organizing',
  'executing',
  'verifying',
  'repairing',
  'refining',
  'delivering',
  'remembering',
  'completed',
  'operating',
  'cancelled',
  'failed',
]);
export type MissionPhase = z.infer<typeof MissionPhase>;

export const TaskKind = z.enum([
  'reason',
  'research',
  'plan',
  'code',
  'execute',
  'analyze',
  'design',
  'verify',
  'deliver',
  'decide',
  'clarify',
]);
export type TaskKind = z.infer<typeof TaskKind>;

export const TaskStatus = z.enum([
  'pending',
  'ready',
  'assigned',
  'running',
  'verifying',
  'repairing',
  'completed',
  'blocked',
  'failed',
  'cancelled',
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const AgentTier = z.enum([
  'tier_1_core',
  'tier_2_director',
  'tier_3_specialist',
  'tier_4_operator',
]);
export type AgentTier = z.infer<typeof AgentTier>;

export const AutonomyLevel = z.enum([
  'l0_answer',
  'l1_recommend',
  'l2_reversible',
  'l3_multistep',
  'l4_checkpointed',
  'l5_continuous',
]);
export type AutonomyLevel = z.infer<typeof AutonomyLevel>;

export const RunOutcome = z.enum([
  'completed_success',
  'completed_partial',
  'blocked_info_needed',
  'failed_unrecoverable',
  'aborted_budget_exceeded',
  'aborted_policy_violation',
  'escalated_to_human',
]);
export type RunOutcome = z.infer<typeof RunOutcome>;

export const EpistemicStatus = z.enum([
  'fact',
  'supported',
  'inferred',
  'weak_inference',
  'assumed',
  'unknown',
  'contested',
]);
export type EpistemicStatus = z.infer<typeof EpistemicStatus>;

export const MemoryScope = z.enum([
  'working',
  'conversation',
  'episodic',
  'semantic',
  'procedural',
  'project',
  'organizational',
]);
export type MemoryScope = z.infer<typeof MemoryScope>;

export const MemoryStatus = z.enum(['active', 'superseded', 'contradicted', 'archived']);
export type MemoryStatus = z.infer<typeof MemoryStatus>;

export const AccessMode = z.enum(['read', 'write', 'read_write']);
export type AccessMode = z.infer<typeof AccessMode>;

export const Verdict = z.enum([
  'accepted',
  'accepted_with_notes',
  'rejected',
  'repair_required',
  'escalate_human',
  'insufficient_info',
]);
export type Verdict = z.infer<typeof Verdict>;

export const Sensitivity = z.enum(['public', 'internal', 'confidential', 'restricted']);
export type Sensitivity = z.infer<typeof Sensitivity>;

export const ErrorCategory = z.enum([
  'unknown',
  'logic',
  'dependency',
  'config',
  'environment',
  'integration',
  'requirement',
  'security',
  'performance',
  'network',
  'permission',
]);
export type ErrorCategory = z.infer<typeof ErrorCategory>;

export const ToolStatus = z.enum([
  'success',
  'failure_tool',
  'failure_timeout',
  'failure_oom',
  'failure_policy',
  'failure_permission',
  'failure_sandbox',
  'awaiting_approval',
  'cancelled',
]);
export type ToolStatus = z.infer<typeof ToolStatus>;

export const ToolScope = z.enum([
  'read_only',
  'workspace_write',
  'compute_exec',
  'sandbox_exec',
  'network_egress',
]);
export type ToolScope = z.infer<typeof ToolScope>;

export const ModelCapability = z.enum([
  'reason.fast',
  'reason.standard',
  'reason.deep',
  'reason.tool_augmented',
  'code.gen.short',
  'code.gen.repo',
  'code.edit',
  'code.review',
  'research.extract',
  'research.synthesize',
  'vision.understand',
  'vision.ocr',
  'vision.chart',
  'audio.transcribe',
  'audio.synthesize',
  'structured.extract',
  'structured.classify',
  'embed.text',
  'embed.code',
  'embed.multimodal',
  'rerank',
  'translate',
]);
export type ModelCapability = z.infer<typeof ModelCapability>;

export const ModelTier = z.enum(['standard', 'advanced', 'frontier', 'research']);
export type ModelTier = z.infer<typeof ModelTier>;

export const DeploymentMode = z.enum([
  'hosted_api',
  'local_ollama',
  'local_vllm',
  'dedicated_gpu',
  'enterprise_private',
]);
export type DeploymentMode = z.infer<typeof DeploymentMode>;

export const License = z.enum([
  'open_source_osi',
  'open_weight',
  'commercial_hosted',
  'private_internal',
]);
export type License = z.infer<typeof License>;

export const DeliveryMode = z.enum(['sync', 'async', 'streaming', 'checkpointed']);
export type DeliveryMode = z.infer<typeof DeliveryMode>;

export const QualityFloor = z.enum(['acceptable', 'good', 'excellent', 'maximum']);
export type QualityFloor = z.infer<typeof QualityFloor>;

export const HealthState = z.enum(['healthy', 'degraded', 'unavailable', 'maintenance']);
export type HealthState = z.infer<typeof HealthState>;

export const FinishReason = z.enum([
  'stop',
  'max_tokens',
  'tool_calls',
  'content_filter',
  'error',
]);
export type FinishReason = z.infer<typeof FinishReason>;
