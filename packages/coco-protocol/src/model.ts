import { z } from 'zod';
import {
  ModelCapability,
  ModelTier,
  DeploymentMode,
  License,
  QualityFloor,
  HealthState,
  FinishReason,
} from './enums';
import { ContextPacketRefSchema, MoneyUsdSchema } from './shared';

export const ModelPreferencesRouteSchema = z.object({
  preferred_models: z.array(z.string()).default([]),
  excluded_models: z.array(z.string()).default([]),
  minimum_tier: z.string().optional(),
  min_context_tokens: z.number().int().nonnegative().optional(),
  requires_tool_calling: z.boolean().default(false),
  requires_vision: z.boolean().default(false),
  requires_json_mode: z.boolean().default(false),
  allows_streaming: z.boolean().default(true),
});
export type ModelPreferencesRoute = z.infer<typeof ModelPreferencesRouteSchema>;

export const GenerationParamsSchema = z.object({
  max_output_tokens: z.number().int().positive().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  top_p: z.number().min(0).max(1).default(1.0),
  frequency_penalty: z.number().min(-2).max(2).default(0),
  presence_penalty: z.number().min(-2).max(2).default(0),
  stop_sequences: z.array(z.string()).default([]),
  response_format: z.enum(['text', 'json', 'structured']).default('text'),
  json_schema_uri: z.string().optional(),
  tool_definitions: z.array(z.string()).default([]),
  reasoning_effort: z.number().int().min(0).max(10).optional(),
  seed: z.number().int().optional(),
});
export type GenerationParams = z.infer<typeof GenerationParamsSchema>;

export const RoutingHintsSchema = z.object({
  max_cost_usd: z.number().nonnegative().optional(),
  max_latency_ms: z.number().int().positive().optional(),
  quality_floor: QualityFloor.default('good'),
  allow_fallback: z.boolean().default(true),
  allow_cross_provider: z.boolean().default(true),
});
export type RoutingHints = z.infer<typeof RoutingHintsSchema>;

export const ModelRouteRequestSchema = z.object({
  route_id: z.string(),
  agent_instance_id: z.string().optional(),
  task_id: z.string().optional(),
  mission_id: z.string().optional(),
  capability: ModelCapability,
  preferences: ModelPreferencesRouteSchema.default({}),
  context_ref: ContextPacketRefSchema.optional(),
  prompt_template_id: z.string().optional(),
  prompt_vars: z.record(z.string(), z.unknown()).default({}),
  params: GenerationParamsSchema.default({}),
  routing_hints: RoutingHintsSchema.default({}),
});
export type ModelRouteRequest = z.infer<typeof ModelRouteRequestSchema>;

export const ModelRouteDecisionSchema = z.object({
  route_id: z.string(),
  selected_model_id: z.string(),
  selected_provider: z.string(),
  selected_endpoint: z.string(),
  fallback_chain: z.array(z.string()).default([]),
  decision_rationale: z.string(),
  estimated_latency_ms: z.number().nonnegative(),
  estimated_cost_usd: MoneyUsdSchema,
  estimated_quality_score: z.number().min(0).max(1),
  decided_at_unix_ms: z.number().int().nonnegative(),
});
export type ModelRouteDecision = z.infer<typeof ModelRouteDecisionSchema>;

// Removing explicit generics typing to allow compiler-driven inference 
// and avoid structural mismatch on optional fields.
export const ContentBlockSchema = z.object({
  kind: z.enum(['text', 'image', 'tool_call', 'tool_result']),
  text: z.string().optional(),
  image_url: z.string().optional(),
  image_media_type: z.string().optional(),
  tool_call: z
    .object({
      tool_call_id: z.string(),
      tool_name: z.string(),
      arguments_json: z.string(),
    })
    .optional(),
  tool_result: z
    .object({
      tool_call_id: z.string(),
      content: z.string(),
      is_error: z.boolean().default(false),
    })
    .optional(),
});
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.array(ContentBlockSchema),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  input_schema_json: z.string(),
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const ModelInferenceRequestSchema = z.object({
  inference_id: z.string(),
  model_id: z.string(),
  messages: z.array(ChatMessageSchema),
  params: GenerationParamsSchema,
  tools: z.array(ToolDefinitionSchema).default([]),
  stream: z.boolean().default(true),
  deadline_unix_ms: z.number().int().nonnegative().optional(),
});
export type ModelInferenceRequest = z.infer<typeof ModelInferenceRequestSchema>;

export const TokenUsageSchema = z.object({
  input_tokens: z.number().int().nonnegative().default(0),
  output_tokens: z.number().int().nonnegative().default(0),
  cached_tokens: z.number().int().nonnegative().default(0),
  reasoning_tokens: z.number().int().nonnegative().default(0),
  cost_usd: MoneyUsdSchema.default(0),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const ModelInferenceEventSchema = z.object({
  inference_id: z.string(),
  sequence: z.number().int().nonnegative(),
  kind: z.enum([
    'stream_start',
    'content_delta',
    'tool_call_delta',
    'usage_update',
    'stream_end',
    'stream_error',
  ]),
  text_delta: z.string().optional(),
  tool_call_delta: z
    .object({
      tool_call_id: z.string(),
      tool_name: z.string().optional(),
      arguments_json_delta: z.string().optional(),
    })
    .optional(),
  usage_snapshot: TokenUsageSchema.optional(),
  finish_reason: FinishReason.optional(),
  error_message: z.string().optional(),
  emitted_at_unix_ms: z.number().int().nonnegative(),
});
export type ModelInferenceEvent = z.infer<typeof ModelInferenceEventSchema>;

export const ModelCostSchema = z.object({
  input_per_million_usd: MoneyUsdSchema,
  output_per_million_usd: MoneyUsdSchema,
  cached_input_per_million_usd: MoneyUsdSchema.optional(),
});
export type ModelCost = z.infer<typeof ModelCostSchema>;

export const ModelFeaturesSchema = z.object({
  supports_tool_calling: z.boolean().default(false),
  supports_parallel_tools: z.boolean().default(false),
  supports_vision: z.boolean().default(false),
  supports_audio: z.boolean().default(false),
  supports_json_mode: z.boolean().default(false),
  supports_structured_output: z.boolean().default(false),
  supports_streaming: z.boolean().default(true),
  supports_reasoning: z.boolean().default(false),
  supports_caching: z.boolean().default(false),
  supports_batch: z.boolean().default(false),
  max_tools_per_request: z.number().int().nonnegative().default(0),
  max_images_per_request: z.number().int().nonnegative().default(0),
});
export type ModelFeatures = z.infer<typeof ModelFeaturesSchema>;

export const ModelPerformanceSchema = z.object({
  median_latency_ms: z.number().nonnegative().optional(),
  p95_latency_ms: z.number().nonnegative().optional(),
  median_tokens_per_second: z.number().nonnegative().optional(),
  reliability_score: z.number().min(0).max(1).optional(),
  quality_score_reasoning: z.number().min(0).max(1).optional(),
  quality_score_coding: z.number().min(0).max(1).optional(),
  quality_score_research: z.number().min(0).max(1).optional(),
  last_evaluated_at_unix_ms: z.number().int().nonnegative().optional(),
});
export type ModelPerformance = z.infer<typeof ModelPerformanceSchema>;

export const CapabilityBindingSchema = z.object({
  capability_id: ModelCapability,
  declared_quality_score: z.number().min(0).max(1).default(0.7),
  observed_quality_score: z.number().min(0).max(1).optional(),
  preferred: z.boolean().default(false),
});
export type CapabilityBinding = z.infer<typeof CapabilityBindingSchema>;

export const EndpointHealthSchema = z.object({
  state: HealthState.default('healthy'),
  success_rate_5m: z.number().min(0).max(1).optional(),
  p50_latency_ms_5m: z.number().nonnegative().optional(),
  p95_latency_ms_5m: z.number().nonnegative().optional(),
  last_error_unix_ms: z.number().int().nonnegative().optional(),
  circuit_breaker_open_until_unix_ms: z.number().int().nonnegative().optional(),
});
export type EndpointHealth = z.infer<typeof EndpointHealthSchema>;

export const EndpointSchema = z.object({
  endpoint_id: z.string(),
  base_url: z.string(),
  region: z.string().default('us-east-1'),
  max_concurrent_requests: z.number().int().positive().default(50),
  supports_streaming: z.boolean().default(true),
  credential_env_var: z.string(),
  health: EndpointHealthSchema.default({}),
});
export type Endpoint = z.infer<typeof EndpointSchema>;

export const RateLimitProfileSchema = z.object({
  requests_per_minute: z.number().int().positive().default(60),
  tokens_per_minute: z.number().int().positive().default(200000),
  concurrent_requests: z.number().int().positive().default(50),
  daily_request_quota: z.number().int().nonnegative().default(0),
  daily_token_quota: z.number().int().nonnegative().default(0),
});
export type RateLimitProfile = z.infer<typeof RateLimitProfileSchema>;

export const EligibilityRulesSchema = z.object({
  allowed_tenants: z.array(z.string()).default([]),
  blocked_tenants: z.array(z.string()).default([]),
  allowed_regions: z.array(z.string()).default([]),
  max_sensitivity: z.array(z.string()).default(['public', 'internal', 'confidential']),
  requires_baa: z.boolean().default(false),
  requires_dpa: z.boolean().default(false),
  data_residency_enforced: z.boolean().default(false),
  tier_restrictions: z.array(z.string()).default([]),
});
export type EligibilityRules = z.infer<typeof EligibilityRulesSchema>;

export const ExtendedModelDescriptorSchema = z.object({
  model_id: z.string(),
  provider: z.string(),
  family: z.string(),
  display_name: z.string(),
  capabilities: z.array(CapabilityBindingSchema),
  context_window_tokens: z.number().int().positive(),
  max_output_tokens: z.number().int().positive(),
  tier: ModelTier,
  license: License,
  deployment_mode: DeploymentMode,
  endpoints: z.array(EndpointSchema),
  rate_limits: RateLimitProfileSchema.default({}),
  cost: ModelCostSchema,
  features: ModelFeaturesSchema.default({}),
  performance: ModelPerformanceSchema.default({}),
  eligibility: EligibilityRulesSchema.default({}),
  registered_at_unix_ms: z.number().int().nonnegative(),
  deprecated_at_unix_ms: z.number().int().nonnegative().optional(),
  replacement_model_id: z.string().optional(),
});
export type ExtendedModelDescriptor = z.infer<typeof ExtendedModelDescriptorSchema>;
