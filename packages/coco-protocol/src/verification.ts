import { z } from 'zod';
import { Verdict, ErrorCategory } from './enums';
import { ArtifactRefSchema, ConfidenceScoreSchema } from './shared';
import { ResourceBudgetSchema } from './mission';
import { FindingSchema } from './agent';

/**
 * Verification Protocol (Deep Spec 2 §7)
 */

export const VerificationDomain = z.enum([
  'software',
  'research',
  'legal',
  'medical',
  'financial',
  'hardware',
  'design',
  'business',
  'scientific',
  'operational',
]);
export type VerificationDomain = z.infer<typeof VerificationDomain>;

export const VerificationRequestSchema = z.object({
  verification_id: z.string(),
  mission_id: z.string(),
  task_id: z.string().optional(),
  requesting_agent_id: z.string(),

  artifacts: z.array(ArtifactRefSchema),
  requirements: z.array(z.string()).default([]),

  target_level: z.number().int().min(0).max(10),
  levels_to_run: z.array(z.number().int().min(0).max(10)).optional(),

  domain: VerificationDomain,
  domain_params: z.record(z.string(), z.unknown()).default({}),

  critic_agent_id: z.string().optional(),
  requires_human_approval: z.boolean().default(false),

  deadline_unix_ms: z.number().int().nonnegative().optional(),
  budget: ResourceBudgetSchema.default({}),
});
export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;

export const CheckResultSchema = z.object({
  check_id: z.string(),
  check_name: z.string(),
  tool_used: z.string().optional(),
  status: z.enum(['passed', 'failed', 'skipped', 'error']),
  message: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  evidence_ref: ArtifactRefSchema.optional(),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

export const LevelResultSchema = z.object({
  level: z.number().int().min(0).max(10),
  level_name: z.string(),
  status: z.enum(['passed', 'failed', 'partial', 'skipped', 'errored']),
  checks_total: z.number().int().nonnegative().default(0),
  checks_passed: z.number().int().nonnegative().default(0),
  checks_failed: z.number().int().nonnegative().default(0),
  checks_skipped: z.number().int().nonnegative().default(0),
  checks: z.array(CheckResultSchema).default([]),
  duration_ms: z.number().int().nonnegative().default(0),
});
export type LevelResult = z.infer<typeof LevelResultSchema>;

export const CriticReportSchema = z.object({
  critic_agent_id: z.string(),
  correctness_score: ConfidenceScoreSchema,
  completeness_score: ConfidenceScoreSchema,
  consistency_score: ConfidenceScoreSchema,
  evidence_quality_score: ConfidenceScoreSchema,
  risk_score: ConfidenceScoreSchema,
  overall_score: ConfidenceScoreSchema,
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  missing_requirements: z.array(z.string()).default([]),
  questionable_assumptions: z.array(z.string()).default([]),
  recommendation: z.enum(['accept', 'revise', 'reject', 'escalate']),
  reasoning: z.string(),
});
export type CriticReport = z.infer<typeof CriticReportSchema>;

export const VerificationResultSchema = z.object({
  verification_id: z.string(),
  verdict: Verdict,
  highest_level_passed: z.number().int().min(0).max(10),
  highest_level_attempted: z.number().int().min(0).max(10),

  level_results: z.array(LevelResultSchema).default([]),
  critic_report: CriticReportSchema.optional(),

  failures: z.array(FindingSchema).default([]),
  warnings: z.array(FindingSchema).default([]),
  repair_recommendations: z.array(z.string()).default([]),

  verification_report_artifact: ArtifactRefSchema.optional(),
  started_at_unix_ms: z.number().int().nonnegative(),
  completed_at_unix_ms: z.number().int().nonnegative(),

  requires_human_review: z.boolean().default(false),
  human_review_ticket_id: z.string().optional(),
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const FailureDiagnosisSchema = z.object({
  failure_id: z.string(),
  category: ErrorCategory,
  root_cause: z.string(),
  affected_artifact_ref: z.string(),
  suggested_strategy: z.string(),
  confidence: ConfidenceScoreSchema,
});
export type FailureDiagnosis = z.infer<typeof FailureDiagnosisSchema>;

export const RepairOrderSchema = z.object({
  repair_id: z.string(),
  verification_id: z.string(),
  mission_id: z.string(),
  task_id: z.string(),
  attempt_number: z.number().int().nonnegative(),
  max_attempts: z.number().int().positive(),
  diagnoses: z.array(FailureDiagnosisSchema),
  proposed_strategies: z.array(z.string()),
  assigned_agent_id: z.string().optional(),
  issued_at_unix_ms: z.number().int().nonnegative(),
  deadline_unix_ms: z.number().int().nonnegative().optional(),
});
export type RepairOrder = z.infer<typeof RepairOrderSchema>;

// The canonical 11 verification level names
export const LEVEL_NAMES = [
  'well_formed', // 0
  'structural_valid', // 1
  'type_correct', // 2
  'lint_clean', // 3
  'unit_verified', // 4
  'integration_verified', // 5
  'requirement_verified', // 6
  'security_verified', // 7
  'performance_verified', // 8
  'critic_verified', // 9
  'acceptance_verified', // 10
] as const;

export type LevelName = (typeof LEVEL_NAMES)[number];

export function levelName(level: number): LevelName | undefined {
  return LEVEL_NAMES[level];
}
