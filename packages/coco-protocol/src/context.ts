import { z } from 'zod';
import { MemoryScope, MemoryStatus, EpistemicStatus } from './enums';

export { MemoryScope, MemoryStatus, EpistemicStatus };

export const SensitivityClass = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
]);
export type SensitivityClass = z.infer<typeof SensitivityClass>;

export const MemoryVisibility = z.enum([
  'private',
  'project',
  'organization',
  'public',
]);
export type MemoryVisibility = z.infer<typeof MemoryVisibility>;

export const Citation = z.object({
  source_id: z.string().optional(),
  evidence_id: z.string().optional(),
  quote: z.string().optional(),
  location: z.string().optional(),
  url: z.string().optional(),
});
export type Citation = z.infer<typeof Citation>;

export const MemoryRecord = z.object({
  memory_id: z.string(),
  organization_id: z.string(),
  scope: MemoryScope,

  user_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  mission_id: z.string().nullable().optional(),
  conversation_id: z.string().nullable().optional(),

  subject: z.string(),
  predicate: z.string(),
  value: z.string(),
  value_structured: z.unknown().nullable().optional(),

  source: z.string(),
  source_ref: z.string().nullable().optional(),
  written_by_agent: z.string().nullable().optional(),
  written_by_run: z.string().nullable().optional(),
  citations: z.array(Citation).default([]),

  epistemic_status: EpistemicStatus.default('assumed'),
  confidence: z.number().min(0).max(1).default(0.8),
  evidence_count: z.number().int().default(0),
  contradicts_ids: z.array(z.string()).default([]),
  supersedes_ids: z.array(z.string()).default([]),

  version: z.number().int().default(1),
  status: MemoryStatus.default('active'),
  expires_at: z.string().nullable().optional(),
  importance: z.number().min(0).max(1).default(0.5),

  visibility: MemoryVisibility.default('project'),
  sensitivity: SensitivityClass.default('internal'),

  embedding_model_id: z.string().nullable().optional(),

  created_at: z.string(),
  updated_at: z.string(),
});
export type MemoryRecord = z.infer<typeof MemoryRecord>;

export const MemoryWriteInput = z.object({
  scope: MemoryScope,
  subject: z.string().min(1),
  predicate: z.string().min(1),
  value: z.string().min(1),
  value_structured: z.unknown().nullable().optional(),

  source: z.string().min(1),
  source_ref: z.string().nullable().optional(),
  written_by_agent: z.string().nullable().optional(),
  written_by_run: z.string().nullable().optional(),
  citations: z.array(Citation).default([]),

  epistemic_status: EpistemicStatus.default('assumed'),
  confidence: z.number().min(0).max(1).default(0.8),

  project_id: z.string().nullable().optional(),
  mission_id: z.string().nullable().optional(),
  conversation_id: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),

  importance: z.number().min(0).max(1).default(0.5),
  visibility: MemoryVisibility.default('project'),
  sensitivity: SensitivityClass.default('internal'),

  supersedes_ids: z.array(z.string()).default([]),
  ttl_seconds: z.number().int().positive().nullable().optional(),
});
export type MemoryWriteInput = z.infer<typeof MemoryWriteInput>;

export const MemoryQuery = z.object({
  scopes: z.array(MemoryScope).optional(),
  project_id: z.string().nullable().optional(),
  mission_id: z.string().nullable().optional(),
  conversation_id: z.string().nullable().optional(),

  text_query: z.string().optional(),
  vector_query: z.string().optional(),

  min_confidence: z.number().min(0).max(1).optional(),
  min_importance: z.number().min(0).max(1).optional(),
  epistemic_status_in: z.array(EpistemicStatus).optional(),
  max_sensitivity: SensitivityClass.optional(),

  limit: z.number().int().positive().max(200).default(20),
  offset: z.number().int().min(0).default(0),

  include_superseded: z.boolean().default(false),
  include_contradicted: z.boolean().default(false),
});
export type MemoryQuery = z.infer<typeof MemoryQuery>;

export const RankedMemory = MemoryRecord.extend({
  score: z.number(),
  score_components: z.object({
    vector_similarity: z.number().optional(),
    text_match: z.number().optional(),
    recency: z.number().optional(),
    importance: z.number().optional(),
    confidence: z.number().optional(),
  }),
});
export type RankedMemory = z.infer<typeof RankedMemory>;

export const ContextCompileRequest = z.object({
  purpose: z.string().min(1),
  project_id: z.string().nullable().optional(),
  mission_id: z.string().nullable().optional(),
  run_id: z.string().nullable().optional(),
  agent_instance_id: z.string().nullable().optional(),
  agent_definition_id: z.string().nullable().optional(),

  query: z.string(),
  scopes: z.array(MemoryScope).optional(),

  max_tokens: z.number().int().positive().default(8000),
  min_relevance: z.number().min(0).max(1).default(0.4),
  max_memories: z.number().int().positive().max(100).default(30),
  max_evidence: z.number().int().min(0).max(50).default(10),
  max_brain_nodes: z.number().int().min(0).max(50).default(10),

  external_provider: z.boolean().default(false),
  include_project_summary: z.boolean().default(true),
  include_recent_decisions: z.boolean().default(true),
  recent_decision_limit: z.number().int().min(0).max(20).default(5),
});
export type ContextCompileRequest = z.infer<typeof ContextCompileRequest>;

export const ContextPacket = z.object({
  packet_id: z.string(),
  purpose: z.string(),
  token_count: z.number().int(),
  compression_ratio: z.number().nullable().optional(),
  packet_content: z.string(),
  packet_hash: z.string(),
  included_memory_ids: z.array(z.string()),
  included_evidence_ids: z.array(z.string()),
  included_node_ids: z.array(z.string()),
  sensitivity: SensitivityClass,
  compiled_at: z.string(),
  expires_at: z.string(),
});
export type ContextPacket = z.infer<typeof ContextPacket>;

export const DecisionInput = z.object({
  question: z.string().min(1),
  options: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        tradeoffs: z.string().optional(),
      })
    )
    .min(1),
  selected_option: z.string().min(1),
  reasoning: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reversible: z.boolean().default(true),
  revisit_criteria: z.string().optional(),
  evidence: z.array(z.unknown()).default([]),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  project_id: z.string().nullable().optional(),
  mission_id: z.string().nullable().optional(),
  run_id: z.string().nullable().optional(),
  created_by_agent: z.string().default('user'),
});
export type DecisionInput = z.infer<typeof DecisionInput>;

export const SourceInput = z.object({
  source_type: z.string().min(1),
  url: z.string().url().nullable().optional(),
  canonical_uri: z.string().nullable().optional(),
  title: z.string().min(1),
  authors: z.array(z.string()).default([]),
  publisher: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  content_excerpt: z.string().nullable().optional(),
  full_content: z.string().min(1),
  language: z.string().nullable().optional(),
  credibility_class: z
    .enum(['primary', 'secondary', 'unverified', 'discredited'])
    .default('unverified'),
  credibility_score: z.number().min(0).max(1).default(0.5),
  metadata: z.record(z.unknown()).default({}),
});
export type SourceInput = z.infer<typeof SourceInput>;

export const EvidenceInput = z.object({
  source_id: z.string(),
  claim: z.string().min(1),
  extracted_quote: z.string().nullable().optional(),
  location_hint: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.8),
  extracted_by_run: z.string().nullable().optional(),
});
export type EvidenceInput = z.infer<typeof EvidenceInput>;

export const KnowledgeNodeInput = z.object({
  project_id: z.string(),
  node_type: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullable().optional(),
  properties: z.record(z.unknown()).default({}),
  origin_source: z.string().default('user'),
  origin_ref: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.8),
});
export type KnowledgeNodeInput = z.infer<typeof KnowledgeNodeInput>;

export const KnowledgeEdgeInput = z.object({
  project_id: z.string(),
  from_node_id: z.string(),
  to_node_id: z.string(),
  relation: z.string().min(1),
  properties: z.record(z.unknown()).default({}),
  confidence: z.number().min(0).max(1).default(0.9),
  origin_source: z.string().default('user'),
  origin_ref: z.string().nullable().optional(),
});
export type KnowledgeEdgeInput = z.infer<typeof KnowledgeEdgeInput>;
