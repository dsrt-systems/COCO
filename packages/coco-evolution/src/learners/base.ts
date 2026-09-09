import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChangeProposal, ProposalSeverity } from '@coco/protocol';

export interface TimeWindow {
  start: Date;
  end: Date;
  kind: '1h' | '24h' | '30d';
}

export interface LearnerContext {
  supabase: SupabaseClient;
  organizationId?: string;
  window: TimeWindow;
}

export abstract class Learner {
  abstract readonly subject_kind: string;
  abstract readonly learner_id: string;

  /**
   * Analyze aggregated metrics and emit zero or more ChangeProposals.
   * Learners NEVER mutate production state directly.
   */
  abstract analyze(ctx: LearnerContext): Promise<ChangeProposal[]>;
}

export function defaultWindow(kind: TimeWindow['kind'] = '24h'): TimeWindow {
  const end = new Date();
  const start = new Date(end);
  if (kind === '1h') start.setHours(start.getHours() - 1);
  else if (kind === '24h') start.setDate(start.getDate() - 1);
  else start.setDate(start.getDate() - 30);
  return { start, end, kind };
}

export function severityFromImpact(qualityDelta: number, safetyTouch: boolean): ProposalSeverity {
  if (safetyTouch) return 'major';
  if (Math.abs(qualityDelta) >= 0.1) return 'major';
  if (Math.abs(qualityDelta) >= 0.03) return 'moderate';
  return 'minor';
}
