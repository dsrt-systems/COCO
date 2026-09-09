import { prefixedId } from '@coco/common';
import type { ChangeProposal } from '@coco/protocol';
import { Learner, type LearnerContext, severityFromImpact } from './base.js';

/**
 * AgentLearner (Deep Spec 9 §6.3)
 * Detects specialist performance deltas and proposes agent version promotions
 * when benchmark + production quality both improve without safety regression.
 */
export class AgentLearner extends Learner {
  readonly subject_kind = 'agent_definition';
  readonly learner_id = 'agent_learner_v1';

  async analyze(ctx: LearnerContext): Promise<ChangeProposal[]> {
    const { supabase, window } = ctx;

    const { data: outcomes, error } = await supabase
      .schema('evolution')
      .from('outcome_records')
      .select('outcome_label, automated_quality_score, agent_selections, failure_categories, domain')
      .gte('finalized_at', window.start.toISOString())
      .lte('finalized_at', window.end.toISOString())
      .limit(500);

    if (error || !outcomes || outcomes.length < 8) return [];

    const byAgent = new Map<string, { n: number; success: number; qSum: number; safetyFlags: number }>();

    for (const o of outcomes) {
      const agents = extractAgentIds(o);
      const success = o.outcome_label === 'SUCCESS';
      const q = o.automated_quality_score ?? (success ? 0.9 : 0.4);
      const safety = Array.isArray(o.failure_categories)
        && o.failure_categories.some((c: string) =>
          c.includes('security') || c.includes('policy') || c.includes('safety')
        );

      for (const agentId of agents) {
        const cur = byAgent.get(agentId) ?? { n: 0, success: 0, qSum: 0, safetyFlags: 0 };
        cur.n += 1;
        if (success) cur.success += 1;
        cur.qSum += q;
        if (safety) cur.safetyFlags += 1;
        byAgent.set(agentId, cur);
      }
    }

    const proposals: ChangeProposal[] = [];

    for (const [agentId, st] of byAgent.entries()) {
      if (st.n < 5) continue;
      const successRate = st.success / st.n;
      const avgQ = st.qSum / st.n;

      // Propose "keep elevated" or "review for regression" signals
      // Promotion candidate: high quality, zero safety flags
      if (avgQ >= 0.9 && st.safetyFlags === 0 && successRate >= 0.9) {
        const qualityDelta = avgQ - 0.85;
        proposals.push({
          proposal_id: prefixedId('proposal'),
          proposal_kind: 'agent_promotion',
          proposer: this.learner_id,
          subject_kind: this.subject_kind,
          subject_id: agentId,
          severity: severityFromImpact(qualityDelta, false),
          current_state: {
            agent_id: agentId,
            status: 'active',
            observed_success_rate: successRate,
            observed_quality: avgQ,
          },
          proposed_state: {
            agent_id: agentId,
            action: 'confirm_rung_or_prefer',
            preferred: true,
            observed_success_rate: successRate,
            observed_quality: avgQ,
            ladder_hint: avgQ >= 0.95 ? 'rung_4_candidate' : 'rung_3_stable',
          },
          evidence: {
            sample_size: st.n,
            success_rate: Number(successRate.toFixed(4)),
            avg_quality: Number(avgQ.toFixed(4)),
            safety_flags: st.safetyFlags,
            window_kind: window.kind,
            window_start: window.start.toISOString(),
            window_end: window.end.toISOString(),
          },
          expected_impact: {
            quality_delta: Number(qualityDelta.toFixed(4)),
            cost_delta_usd_per_call: 0,
            latency_delta_ms: 0,
            safety_delta: 0,
          },
          risk: {
            severity: 'LOW',
            reversible: true,
            blast_radius: 'LIMITED',
            notes: 'Preference flag only; no methodology rewrite',
          },
          required_approvers: ['domain_director'],
          shadow_duration_hours: 168, // 7d moderate
          rollout_plan: {
            stages: [
              { traffic_percent: 5, minimum_duration_hours: 48 },
              { traffic_percent: 25, minimum_duration_hours: 72 },
              { traffic_percent: 100, minimum_duration_hours: 48 },
            ],
            rollback_criteria: 'any safety flag OR quality drop > 5%',
          },
          status: 'pending_review',
          created_at: new Date().toISOString(),
        });
      }

      // Regression signal
      if ((avgQ < 0.7 || st.safetyFlags > 0) && st.n >= 5) {
        proposals.push({
          proposal_id: prefixedId('proposal'),
          proposal_kind: 'agent_promotion',
          proposer: this.learner_id,
          subject_kind: this.subject_kind,
          subject_id: agentId,
          severity: st.safetyFlags > 0 ? 'major' : 'moderate',
          current_state: {
            agent_id: agentId,
            status: 'active',
            observed_success_rate: successRate,
            observed_quality: avgQ,
            safety_flags: st.safetyFlags,
          },
          proposed_state: {
            agent_id: agentId,
            action: 'flag_regression_review',
            preferred: false,
            pin_prior_version: true,
          },
          evidence: {
            sample_size: st.n,
            success_rate: Number(successRate.toFixed(4)),
            avg_quality: Number(avgQ.toFixed(4)),
            safety_flags: st.safetyFlags,
            window_kind: window.kind,
          },
          expected_impact: {
            quality_delta: Number((avgQ - 0.85).toFixed(4)),
            cost_delta_usd_per_call: 0,
            latency_delta_ms: 0,
            safety_delta: st.safetyFlags > 0 ? -0.1 : 0,
          },
          risk: {
            severity: st.safetyFlags > 0 ? 'HIGH' : 'MEDIUM',
            reversible: true,
            blast_radius: 'LIMITED',
            notes: 'Regression flag — requires Domain Director review before any pin change',
          },
          required_approvers: ['domain_director', 'a3_universal_critic'],
          shadow_duration_hours: 0,
          rollout_plan: {
            stages: [],
            rollback_criteria: 'n/a — review only',
          },
          status: 'pending_review',
          created_at: new Date().toISOString(),
        });
      }
    }

    return proposals;
  }
}

function extractAgentIds(o: Record<string, unknown>): string[] {
  const raw = o['agent_selections'];
  if (!Array.isArray(raw) || raw.length === 0) return ['A1_coco_director'];
  const out: string[] = [];
  for (const a of raw) {
    if (typeof a === 'string') out.push(a);
    else if (a && typeof a === 'object') {
      if ('agent_definition_id' in a) out.push(String((a as any).agent_definition_id));
      else if ('agent_id' in a) out.push(String((a as any).agent_id));
    }
  }
  return out.length > 0 ? out : ['A1_coco_director'];
}
