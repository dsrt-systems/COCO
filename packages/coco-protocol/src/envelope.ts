import { z } from 'zod';
import { Sensitivity } from './enums';
import { Sha256HexSchema } from './shared';

/**
 * CocoEnvelope — the universal wrapper for every inter-fabric message.
 * Deep Spec 2 §1.
 */
export const CocoEnvelopeSchema = z.object({
  // Identity
  envelope_id: z.string(),
  schema_uri: z.string(),
  schema_version: z.string(),

  // Origin
  emitter_fabric: z.string(),
  emitter_component: z.string(),
  emitter_instance: z.string().optional(),

  // Tenancy
  organization_id: z.string(),
  user_id: z.string().optional(),

  // Correlation
  mission_id: z.string().optional(),
  run_id: z.string().optional(),
  task_id: z.string().optional(),
  causation_id: z.string().optional(),
  correlation_id: z.string().optional(),

  // Timing (unix ms — we use ms in TS layer; ns is preserved for Postgres)
  emitted_at_unix_ms: z.number().int().nonnegative(),
  deadline_unix_ms: z.number().int().nonnegative().optional(),

  // Delivery guarantees
  idempotency_key: z.string(),
  attempt_number: z.number().int().positive().default(1),

  // Payload (already serialized as JSON; hash covers it)
  payload: z.unknown(),
  payload_hash: Sha256HexSchema,

  // Classification
  sensitivity: Sensitivity.default('internal'),
  tags: z.array(z.string()).default([]),

  // Integrity
  signature: z.string().optional(), // Ed25519 hex; optional for internal same-process
});
export type CocoEnvelope = z.infer<typeof CocoEnvelopeSchema>;

/**
 * Helper to construct a canonical envelope for hashing/signing.
 * Excludes the signature field itself (which signs the rest).
 */
export function canonicalEnvelopeFields(env: CocoEnvelope): Omit<CocoEnvelope, 'signature'> {
  const { signature: _sig, ...rest } = env;
  return rest;
}
