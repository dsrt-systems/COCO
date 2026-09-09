import { prefixedId } from '@coco/common';
import type { ChangeProposal } from '@coco/protocol';
import { Learner, type LearnerContext } from './base.js';

/**
 * VerificationLearner (Deep Spec 9 §6.6)
 * Tuned from level_results pass rates — proposes threshold tighten/loosen.
 */
export class VerificationLearner extends Learner {
  readonly subject_kind = 'verification_policy';
  readonly learner_id = 'verification_learner_v1';

  async analyze(ctx: LearnerContext): Promise<ChangeProposal[]> {
    const { supabase, window } = ctx;

    const { data: levels } = await supabase
      .schema('verification')
      .from('level_results')
      .select('level, level_name, status, checks_total, checks_passed, checks_failed, created_at')
      .gte('created_at', window.start.toISOString())
      .lte('created_at', window.end.toISOString())
      .limit(2000);

    if (!levels || levels.length < 10) return [];

    const byLevel = new Map<number, { n: number; passed: number; failed: number }>();
    for (const l of levels) {
      const lvl = Number(l.level);
      const cur = byLevel.get(lvl) ?? { n: 0, passed: 0, failed: 0 };
      cur.n += 1;
      if (l.status === 'passed') cur.passed += 1;
      if (l.status === 'failed') cur.failed += 1;
      byLevel.set(lvl, cur);
    }

    const proposals: ChangeProposal[] = [];

    for (const [level, st] of byLevel.entries()) {
      if (st.n < 5) continue;
      const passRate = st.passed / st.n;
      const failRate = st.failed / st.n;

      // Always-pass levels may be too loose (except L0 which should usually pass)
      if (level >= 3 && passRate >= 0.99 && st.n >= 15) {
        proposals.push({
          proposal_id: prefixedId('proposal'),
          proposal_kind: 'verification_tuning',
          proposer: this.learner_id,
          subject_kind: this.subject_kind,
          subject_id: `level_${level}`,
          severity: 'minor',
          current_state: { level, pass_rate: passRate, n: st.n },
          proposed_state: {
            level,
            action: 'tighten_checks',
            add_checks: true,
            note: 'Near-perfect pass rate may indicate weak battery',
          },
          evidence: { sample_size: st.n, pass_rate: passRate, fail_rate: failRate, window_kind: window.kind },
          expected_impact: {
            quality_delta: 0.01,
            cost_delta_usd_per_call: 0.002,
            latency_delta_ms: 50,
            safety_delta: 0.01,
          },
          risk: { severity: 'LOW', reversible: true, blast_radius: 'LIMITED', notes: 'Dual-check shadow recommended' },
          required_approvers: ['verification_director'],
          shadow_duration_hours: 72,
          rollout_plan: {
            stages: [{ traffic_percent: 100, note: 'dual-check mode first' }],
            rollback_criteria: 'FP rate spike > 2x baseline',
          },
          status: 'pending_review',
          created_at: new Date().toISOString(),
        });
      }

      // High fail rates may be too strict or broken checks
      if (failRate >= 0.4 && st.n >= 10) {
        proposals.push({
          proposal_id: prefixedId('proposal'),
          proposal_kind: 'verification_tuning',
          proposer: this.learner_id,
          subject_kind: this.subject_kind,
          subject_id: `level_${level}`,
          severity: 'moderate',
          current_state: { level, pass_rate: passRate, fail_rate: failRate, n: st.n },
          proposed_state: {
            level,
            action: 'investigate_or_loosen',
            note: 'High fail rate — check FP vs true defects before loosening',
          },
          evidence: { sample_size: st.n, pass_rate: passRate, fail_rate: failRate, window_kind: window.kind },
          expected_impact: {
            quality_delta: 0,
            cost_delta_usd_per_call: -0.001,
            latency_delta_ms: -20,
            safety_delta: 0,
          },
          risk: {
            severity: 'MEDIUM',
            reversible: true,
            blast_radius: 'LIMITED',
            notes: 'Do not loosen security L7 without Security review',
          },
          required_approvers: level === 7 ? ['verification_director', 'security'] : ['verification_director'],
          shadow_duration_hours: 72,
          rollout_plan: {
            stages: [{ traffic_percent: 100, note: 'dual-check' }],
            rollback_criteria: 'FN rate increase on known-bad fixtures',
          },
          status: 'pending_review',
          created_at: new Date().toISOString(),
        });
      }
    }

    return proposals;
  }
}
