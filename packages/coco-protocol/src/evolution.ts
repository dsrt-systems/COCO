import { z } from 'zod';

export const ProposalSeverity = z.enum(['minor', 'moderate', 'major']);
export type ProposalSeverity = z.infer<typeof ProposalSeverity>;

export const ProposalStatus = z.enum([
  'pending_review',
  'in_shadow',
  'approved',
  'rolling_out',
  'active',
  'rejected',
  'withdrawn',
  'rolled_back',
]);
export type ProposalStatus = z.infer<typeof ProposalStatus>;

export const OutcomeRecordSchema = z.object({
  outcome_id: z.string(),
  organization_id: z.string(),
  mission_id: z.string(),
  project_id: z.string().optional(),
  
  mission_tier: z.enum(['default', 'pro', 'ranger', 'enterprise']).default('default'),
  cognitive_depth: z.number().int().min(0).max(6).default(3),
  domain: z.string().optional(),

  outcome_label: z.enum(['SUCCESS', 'PARTIAL', 'FAILED', 'ABORTED', 'ESCALATED']).default('SUCCESS'),
  outcome_confidence: z.number().min(0).max(1).default(1.0),
  automated_quality_score: z.number().min(0).max(1).optional(),
  human_rating: z.number().int().min(1).max(5).optional(),
  benchmark_score: z.number().min(0).max(1).optional(),

  execution_summary: z.record(z.unknown()).default({}),
  quality_signals: z.record(z.unknown()).default({}),
  resources: z.record(z.unknown()).default({}),
  failure_categories: z.array(z.string()).default([]),

  mission_started_at: z.string(),
  mission_completed_at: z.string().optional(),
  finalized_at: z.string(),
});
export type OutcomeRecord = z.infer<typeof OutcomeRecordSchema>;

export const ChangeProposalSchema = z.object({
  proposal_id: z.string(),
  proposal_kind: z.string(),
  proposer: z.string(),
  subject_kind: z.string(),
  subject_id: z.string(),
  severity: ProposalSeverity,

  current_state: z.record(z.unknown()),
  proposed_state: z.record(z.unknown()),
  evidence: z.record(z.unknown()).default({}),
  expected_impact: z.record(z.unknown()).default({}),
  risk: z.record(z.unknown()).default({}),

  required_approvers: z.array(z.string()).default([]),
  shadow_duration_hours: z.number().int().default(24),
  rollout_plan: z.record(z.unknown()).default({}),

  status: ProposalStatus.default('pending_review'),
  created_at: z.string(),
});
export type ChangeProposal = z.infer<typeof ChangeProposalSchema>;
