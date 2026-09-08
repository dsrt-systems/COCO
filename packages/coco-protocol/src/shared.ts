import { z } from 'zod';
import { ToolStatus, Sensitivity } from './enums';

/**
 * Shared value types used across multiple protocols (Deep Spec 2 §8).
 */

export const UlidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'invalid ULID');
export type Ulid = z.infer<typeof UlidSchema>;

export const PrefixedIdSchema = z
  .string()
  .regex(/^[a-z]+_[0-9A-HJKMNP-TV-Z]{26}$/, 'invalid prefixed ULID');
export type PrefixedId = z.infer<typeof PrefixedIdSchema>;

export const Sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/, 'invalid sha256 hex');
export type Sha256Hex = z.infer<typeof Sha256HexSchema>;

export const ConfidenceScoreSchema = z.number().min(0).max(1);
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

export const MoneyUsdSchema = z.number().min(0);
export type MoneyUsd = z.infer<typeof MoneyUsdSchema>;

export const ArtifactRefSchema = z.object({
  artifact_id: z.string(),
  uri: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  sha256: Sha256HexSchema,
  storage_backend: z.enum(['s3', 'postgres', 'pgvector', 'supabase_storage', 'vercel_blob']),
});
export type ArtifactRef = z.infer<typeof ArtifactRefSchema>;

export const ContextPacketRefSchema = z.object({
  packet_id: z.string(),
  uri: z.string(),
  sha256: Sha256HexSchema,
  token_count: z.number().int().nonnegative(),
  compiled_at_unix_ms: z.number().int().nonnegative(),
});
export type ContextPacketRef = z.infer<typeof ContextPacketRefSchema>;

export const ContextSnapshotSchema = z.object({
  snapshot_id: z.string(),
  uri: z.string(),
  sha256: Sha256HexSchema,
  included_memory_ids: z.array(z.string()),
});
export type ContextSnapshot = z.infer<typeof ContextSnapshotSchema>;

export const ModelCallRefSchema = z.object({
  call_id: z.string(),
  model_id: z.string(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cost_usd: MoneyUsdSchema,
  latency_ms: z.number().int().nonnegative(),
});
export type ModelCallRef = z.infer<typeof ModelCallRefSchema>;

export const ToolCallRefSchema = z.object({
  invocation_id: z.string(),
  tool_id: z.string(),
  status: ToolStatus,
  latency_ms: z.number().int().nonnegative(),
});
export type ToolCallRef = z.infer<typeof ToolCallRefSchema>;

export const DecisionRefSchema = z.object({
  decision_id: z.string(),
  uri: z.string(),
  summary: z.string(),
});
export type DecisionRef = z.infer<typeof DecisionRefSchema>;

export const MemoryRefSchema = z.object({
  memory_id: z.string(),
  scope: z.string(),
  uri: z.string(),
});
export type MemoryRef = z.infer<typeof MemoryRefSchema>;

export const EvidenceRefSchema = z.object({
  evidence_id: z.string(),
  source_uri: z.string(),
  sha256: Sha256HexSchema,
  confidence: ConfidenceScoreSchema,
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
