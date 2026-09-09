import { prefixedId } from '@coco/common';
import type { ChangeProposal } from '@coco/protocol';
import { Learner, type LearnerContext } from './base';

/**
 * CorpusLearner (Deep Spec 9 §6.5)
 * Detects stale / unused sources and proposes refresh, add, or retire actions.
 */
export class CorpusLearner extends Learner {
  readonly subject_kind = 'domain_corpus';
  readonly learner_id = 'corpus_learner_v1';

  async analyze(ctx: LearnerContext): Promise<ChangeProposal[]> {
    const { supabase, window } = ctx;

    const { data: sources } = await supabase
      .schema('research')
      .from('sources')
      .select('source_id, title, source_type, credibility_class, retrieved_at, credibility_score')
      .limit(500);

    if (!sources || sources.length === 0) return [];

    const now = window.end.getTime();
    const proposals: ChangeProposal[] = [];

    const stale: typeof sources = [];
    const fresh: typeof sources = [];

    for (const s of sources) {
      const retrieved = s.retrieved_at ? new Date(s.retrieved_at).getTime() : 0;
      const ageHours = retrieved > 0 ? (now - retrieved) / (1000 * 60 * 60) : 9999;
      // Heuristic: non-book sources stale after 14 days
      if (ageHours > 24 * 14) stale.push(s);
      else fresh.push(s);
    }

    if (stale.length >= 3) {
      proposals.push({
        proposal_id: prefixedId('proposal'),
        proposal_kind: 'corpus_update',
        proposer: this.learner_id,
        subject_kind: this.subject_kind,
        subject_id: 'org_corpus',
        severity: stale.length > 20 ? 'moderate' : 'minor',
        current_state: {
          total_sources: sources.length,
          stale_count: stale.length,
          fresh_count: fresh.length,
        },
        proposed_state: {
          action: 'refresh_stale_sources',
          source_ids: stale.slice(0, 50).map((s) => s.source_id),
          refresh_policy: 'priority_by_credibility_then_age',
        },
        evidence: {
          sample_size: sources.length,
          stale_count: stale.length,
          oldest: stale
            .map((s) => s.retrieved_at)
            .filter(Boolean)
            .sort()[0] ?? null,
          window_kind: window.kind,
        },
        expected_impact: {
          quality_delta: 0.02,
          cost_delta_usd_per_call: 0.001,
          latency_delta_ms: 0,
          safety_delta: 0,
        },
        risk: {
          severity: 'LOW',
          reversible: true,
          blast_radius: 'ISOLATED',
          notes: 'Refresh does not delete; supersession preserves history',
        },
        required_approvers: stale.length > 20 ? ['corpus_engineer', 'domain_director'] : ['corpus_engineer'],
        shadow_duration_hours: 24,
        rollout_plan: {
          stages: [{ traffic_percent: 100, minimum_duration_hours: 1, note: 'corpus refresh job' }],
          rollback_criteria: 'retrieval quality regression on smoke queries',
        },
        status: 'pending_review',
        created_at: new Date().toISOString(),
      });
    }

    // Discredited sources → retire
    const discredited = sources.filter((s) => s.credibility_class === 'discredited');
    if (discredited.length > 0) {
      proposals.push({
        proposal_id: prefixedId('proposal'),
        proposal_kind: 'corpus_update',
        proposer: this.learner_id,
        subject_kind: this.subject_kind,
        subject_id: 'org_corpus_discredited',
        severity: 'moderate',
        current_state: { discredited_count: discredited.length },
        proposed_state: {
          action: 'retire_sources',
          source_ids: discredited.map((s) => s.source_id),
        },
        evidence: {
          sample_size: discredited.length,
          source_ids: discredited.map((s) => s.source_id),
        },
        expected_impact: {
          quality_delta: 0.01,
          cost_delta_usd_per_call: 0,
          latency_delta_ms: 0,
          safety_delta: 0.02,
        },
        risk: {
          severity: 'LOW',
          reversible: true,
          blast_radius: 'ISOLATED',
          notes: 'Retire = status flag; rows retained',
        },
        required_approvers: ['domain_director'],
        shadow_duration_hours: 0,
        rollout_plan: { stages: [], rollback_criteria: 'n/a' },
        status: 'pending_review',
        created_at: new Date().toISOString(),
      });
    }

    return proposals;
  }
}

