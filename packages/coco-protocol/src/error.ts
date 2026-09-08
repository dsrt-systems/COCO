import { z } from 'zod';
import { ErrorCategory } from './enums';
import { ArtifactRefSchema } from './shared';

/**
 * Universal error envelope (Deep Spec 2 §10).
 */

export const ErrorSeverity = z.enum(['info', 'warn', 'error', 'critical', 'fatal']);
export type ErrorSeverity = z.infer<typeof ErrorSeverity>;

export const CocoErrorSchema = z.object({
  error_id: z.string(),
  category: ErrorCategory,
  severity: ErrorSeverity.default('error'),
  code: z.string(),
  message: z.string(),

  root_cause: z.string().optional(),
  suggested_repair: z.string().optional(),
  retryable: z.boolean().default(false),
  retry_after_ms: z.number().int().nonnegative().optional(),

  originating_envelope_id: z.string().optional(),
  originating_fabric: z.string().optional(),
  originating_component: z.string().optional(),

  diagnostic_data: z.record(z.string(), z.unknown()).default({}),
  stack_trace: z.array(z.string()).default([]),
  logs_artifact_ref: ArtifactRefSchema.optional(),

  occurred_at_unix_ms: z.number().int().nonnegative(),
});
export type CocoErrorPayload = z.infer<typeof CocoErrorSchema>;
