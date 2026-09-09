import { z } from 'zod';

export const VerificationVerdict = z.enum([
  'accepted',
  'accepted_with_notes',
  'rejected',
  'repair_required',
  'escalate_human',
  'insufficient_info'
]);
export type VerificationVerdict = z.infer<typeof VerificationVerdict>;

export const CriticRecommendation = z.enum(['accept', 'revise', 'reject', 'escalate']);
export type CriticRecommendation = z.infer<typeof CriticRecommendation>;

export const VerificationRequestSchema = z.object({
  mission_id: z.string(),
  task_id: z.string().optional(),
  requesting_agent_id: z.string(),
  artifacts: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  target_level: z.number().int().min(0).max(10).default(6),
  levels_to_run: z.array(z.number().int().min(0).max(10)).optional(),
  domain: z.string(),
  domain_params: z.record(z.unknown()).default({}),
  critic_agent_id: z.string().optional(),
  requires_human_approval: z.boolean().default(false),
});
export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;

export const CheckResultSchema = z.object({
  check_id: z.string(),
  check_name: z.string(),
  tool_used: z.string().optional(),
  status: z.enum(['passed', 'failed', 'skipped', 'error']),
  message: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  evidence_artifact_ref: z.string().optional(),
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
  correctness_score: z.number().min(0).max(1),
  completeness_score: z.number().min(0).max(1),
  consistency_score: z.number().min(0).max(1),
  evidence_quality_score: z.number().min(0).max(1),
  risk_score: z.number().min(0).max(1),
  overall_score: z.number().min(0).max(1),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  missing_requirements: z.array(z.string()).default([]),
  questionable_assumptions: z.array(z.string()).default([]),
  recommendation: CriticRecommendation,
  reasoning: z.string(),
});
export type CriticReport = z.infer<typeof CriticReportSchema>;

export const VerificationResultSchema = z.object({
  verification_id: z.string(),
  verdict: VerificationVerdict,
  highest_level_passed: z.number().int().min(0).max(10).optional(),
  highest_level_attempted: z.number().int().min(0).max(10).optional(),
  level_results: z.array(LevelResultSchema).default([]),
  critic_report: CriticReportSchema.optional(),
  failures: z.array(z.unknown()).default([]),
  repair_recommendations: z.array(z.string()).default([]),
  verification_report_artifact: z.string().optional(),
  started_at: z.string(),
  completed_at: z.string(),
  requires_human_review: z.boolean().default(false),
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const FailureDiagnosisSchema = z.object({
  failure_id: z.string(),
  category: z.string(),
  root_cause: z.string(),
  affected_artifact_ref: z.string().optional(),
  suggested_strategy: z.string(),
  confidence: z.number().min(0).max(1),
});
export type FailureDiagnosis = z.infer<typeof FailureDiagnosisSchema>;

export const RepairOrderSchema = z.object({
  repair_id: z.string(),
  verification_id: z.string(),
  mission_id: z.string(),
  task_id: z.string(),
  attempt_number: z.number().int().positive(),
  max_attempts: z.number().int().positive().default(3),
  diagnoses: z.array(FailureDiagnosisSchema),
  proposed_strategies: z.array(z.string()),
  assigned_agent_id: z.string().optional(),
});
export type RepairOrder = z.infer<typeof RepairOrderSchema>;
