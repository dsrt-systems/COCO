import { z } from 'zod';
import { ToolScope } from './enums.js';

export { ToolScope };

export const ToolCategory = z.enum([
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
export type ToolCategory = z.infer<typeof ToolCategory>;

export const ToolExecutionStatus = z.enum([
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
export type ToolExecutionStatus = z.infer<typeof ToolExecutionStatus>;

export const ResourceLimits = z.object({
  cpu_cores: z.number().int().positive().default(2),
  memory_mb: z.number().int().positive().default(1024),
  disk_mb: z.number().int().positive().default(2048),
  gpu_count: z.number().int().min(0).default(0),
  max_wall_seconds: z.number().int().positive().default(120),
});
export type ResourceLimits = z.infer<typeof ResourceLimits>;

export const NetworkPolicy = z.object({
  egress_allowed: z.boolean().default(false),
  allowed_domains: z.array(z.string()).default([]),
  blocked_domains: z.array(z.string()).default([]),
  allowed_ports: z.array(z.number().int()).default([]),
  proxy_required: z.boolean().default(false),
  dns_over_https_only: z.boolean().default(true),
  bytes_per_second_limit: z.number().int().default(10485760),
});
export type NetworkPolicy = z.infer<typeof NetworkPolicy>;

export const ToolDescriptor = z.object({
  tool_id: z.string(),
  tool_version: z.string().default('1.0.0'),
  display_name: z.string(),
  description: z.string(),
  category: ToolCategory,
  operator_agent_id: z.string(),
  input_schema_json: z.record(z.unknown()),
  output_schema_json: z.record(z.unknown()),
  required_scopes: z.array(ToolScope).default([]),
  requires_human_approval: z.boolean().default(false),
  idempotent: z.boolean().default(false),
  destructive: z.boolean().default(false),
  default_limits: ResourceLimits.default({
    cpu_cores: 2,
    memory_mb: 1024,
    disk_mb: 2048,
    gpu_count: 0,
    max_wall_seconds: 120,
  }),
});
export type ToolDescriptor = z.infer<typeof ToolDescriptor>;

export const ToolInvocationRequest = z.object({
  agent_instance_id: z.string(),
  task_id: z.string().optional(),
  mission_id: z.string().optional(),
  run_id: z.string().optional(),
  tool_id: z.string(),
  tool_version: z.string().default('1.0.0'),
  arguments: z.record(z.unknown()),
  capability_token_id: z.string(),
  timeout_ms: z.number().int().positive().default(120000),
  max_output_bytes: z.number().int().positive().default(5242880),
  requires_human_approval: z.boolean().default(false),
});
export type ToolInvocationRequest = z.infer<typeof ToolInvocationRequest>;

export const ToolInvocationResult = z.object({
  invocation_id: z.string(),
  tool_id: z.string(),
  status: ToolExecutionStatus,
  output: z.record(z.unknown()).optional(),
  logs_excerpt: z.string().optional(),
  stderr_summary: z.string().optional(),
  exit_code: z.number().int().optional(),
  wall_time_ms: z.number().int().default(0),
  cpu_time_ms: z.number().int().default(0),
  memory_peak_mb: z.number().int().default(0),
  error_category: z.string().optional(),
  error_message: z.string().optional(),
  retryable: z.boolean().default(false),
  started_at: z.string(),
  completed_at: z.string().optional(),
});
export type ToolInvocationResult = z.infer<typeof ToolInvocationResult>;

export const SandboxSpec = z.object({
  runtime_kind: z.enum(['e2b_firecracker', 'docker', 'local']).default('e2b_firecracker'),
  image: z.string().default('base'),
  resource_limits: ResourceLimits.default({
    cpu_cores: 2,
    memory_mb: 1024,
    disk_mb: 2048,
    gpu_count: 0,
    max_wall_seconds: 120,
  }),
  network_policy: NetworkPolicy.default({
    egress_allowed: false,
    allowed_domains: [],
    blocked_domains: [],
    allowed_ports: [],
    proxy_required: false,
    dns_over_https_only: true,
    bytes_per_second_limit: 10485760,
  }),
  workspace_root: z.string().default('/workspace'),
  ttl_seconds: z.number().int().positive().default(600),
});
export type SandboxSpec = z.infer<typeof SandboxSpec>;

export const SandboxHandle = z.object({
  sandbox_id: z.string(),
  external_sandbox_id: z.string(),
  runtime_kind: z.string(),
  workspace_root: z.string(),
  status: z.enum(['allocating', 'ready', 'executing', 'released', 'failed']),
  allocated_at: z.string(),
});
export type SandboxHandle = z.infer<typeof SandboxHandle>;
