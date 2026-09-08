import { z } from 'zod';
import { ToolStatus, ToolScope, ErrorCategory } from './enums';
import { ArtifactRefSchema, Sha256HexSchema } from './shared';

/**
 * Tool Protocol (Deep Spec 2 §4)
 */

export const NetworkPolicySchema = z.object({
  egress_allowed: z.boolean().default(false),
  allowed_domains: z.array(z.string()).default([]),
  allowed_ports: z.array(z.number().int()).default([]),
  proxy_required: z.boolean().default(true),
});
export type NetworkPolicy = z.infer<typeof NetworkPolicySchema>;

export const ResourceLimitsSchema = z.object({
  cpu_cores: z.number().int().positive().default(1),
  memory_mb: z.number().int().positive().default(512),
  disk_mb: z.number().int().positive().default(1024),
  gpu_count: z.number().int().nonnegative().default(0),
  max_wall_seconds: z.number().int().positive().default(300),
});
export type ResourceLimits = z.infer<typeof ResourceLimitsSchema>;

export const ExecutionContextSchema = z.object({
  sandbox_id: z.string().optional(),
  workspace_root: z.string().default('/workspace'),
  env: z.record(z.string(), z.string()).default({}),
  mounted_artifact_refs: z.array(z.string()).default([]),
  network_policy: NetworkPolicySchema.default({}),
});
export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;

export const ToolInvocationRequestSchema = z.object({
  invocation_id: z.string(),
  agent_instance_id: z.string(),
  task_id: z.string().optional(),
  mission_id: z.string(),

  tool_id: z.string(),
  tool_version: z.string().default('latest'),

  arguments: z.record(z.string(), z.unknown()),
  arguments_hash: Sha256HexSchema,

  exec_context: ExecutionContextSchema.default({}),

  capability_token: z.string(),
  token_expiry_unix_ms: z.number().int().nonnegative(),

  timeout_ms: z.number().int().positive().default(60000),
  max_output_bytes: z.number().int().positive().default(1048576),
  limits: ResourceLimitsSchema.default({}),
  requires_human_approval: z.boolean().default(false),
});
export type ToolInvocationRequest = z.infer<typeof ToolInvocationRequestSchema>;

export const ErrorReportSchema = z.object({
  category: ErrorCategory,
  message: z.string(),
  root_cause: z.string().optional(),
  suggested_repair: z.string().optional(),
  stack_trace: z.array(z.string()).default([]),
  retryable: z.boolean().default(false),
  retry_after_ms: z.number().int().nonnegative().optional(),
});
export type ErrorReport = z.infer<typeof ErrorReportSchema>;

export const ToolInvocationResultSchema = z.object({
  invocation_id: z.string(),
  tool_id: z.string(),
  status: ToolStatus,

  output: z.record(z.string(), z.unknown()).optional(),
  output_artifact_ref: ArtifactRefSchema.optional(),
  output_hash: Sha256HexSchema.optional(),

  stderr_summary: z.string().optional(),
  logs_artifact_ref: ArtifactRefSchema.optional(),
  exit_code: z.number().int().optional(),

  started_at_unix_ms: z.number().int().nonnegative(),
  completed_at_unix_ms: z.number().int().nonnegative(),
  wall_time_ms: z.number().int().nonnegative(),
  cpu_time_ms: z.number().int().nonnegative().optional(),
  memory_peak_mb: z.number().int().nonnegative().optional(),

  error: ErrorReportSchema.optional(),
});
export type ToolInvocationResult = z.infer<typeof ToolInvocationResultSchema>;

export const ToolCategorySchema = z.enum([
  'browser',
  'terminal',
  'filesystem',
  'git',
  'database',
  'http',
  'python',
  'node',
  'docker',
  'deploy',
  'search',
  'research_db',
  'domain_specific',
]);
export type ToolCategory = z.infer<typeof ToolCategorySchema>;

export const ToolDescriptorSchema = z.object({
  tool_id: z.string(),
  tool_version: z.string(),
  display_name: z.string(),
  description: z.string(),

  category: ToolCategorySchema,
  operator_agent_id: z.string(),

  input_schema_uri: z.string(),
  output_schema_uri: z.string(),

  required_scopes: z.array(ToolScope),
  requires_human_approval: z.boolean().default(false),
  idempotent: z.boolean().default(false),
  destructive: z.boolean().default(false),
  default_limits: ResourceLimitsSchema.default({}),

  median_latency_ms: z.number().nonnegative().optional(),
  failure_rate: z.number().min(0).max(1).optional(),
  avg_cost_usd: z.number().nonnegative().optional(),
});
export type ToolDescriptor = z.infer<typeof ToolDescriptorSchema>;

export const CapabilityTokenSchema = z.object({
  token_id: z.string(),
  agent_instance_id: z.string(),
  tool_id: z.string(),
  granted_scope: ToolScope,
  max_invocations: z.number().int().positive(),
  invocations_used: z.number().int().nonnegative().default(0),
  issued_at_unix_ms: z.number().int().nonnegative(),
  expires_at_unix_ms: z.number().int().nonnegative(),
  issued_by: z.string().default('a6_risk_officer'),
  signature: z.string(),
});
export type CapabilityToken = z.infer<typeof CapabilityTokenSchema>;
