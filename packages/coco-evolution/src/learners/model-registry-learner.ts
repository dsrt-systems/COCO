import { prefixedId } from '@coco/common';
import type { ChangeProposal } from '@coco/protocol';
import { Learner, type LearnerContext, severityFromImpact } from './base.js';

/**
 * ModelRegistryLearner (Deep Spec 9 §6.4)
 * Proposes model promotion/deprecation from outcome-linked quality & cost.
 */
export class ModelRegistryLearner extends Learner {
  readonly subject_kind = 'model_registry';
  readonly learner_id = 'model_registry_learner_v1';

  async analyze(ctx: LearnerContext): Promise<ChangeProposal[]> {
    const { supabase, window } = ctx;

    // Prefer live model_calls aggregates when available
    const { data: calls } = await supabase
      .schema('models')
      .from('model_calls')
      .select('model_id, status, cost_usd, latency_ms, input_tokens, output_tokens')
      .gte('started_at', window.start.toISOString())
      .lte('started_at', window.end.toISOString())
      .limit(2000);

    if (!calls || calls.length < 20) return [];

    const byModel = new Map<string, {
      n: number; ok: number; cost: number; latency: number;
    }>();

    for (const c of calls) {
      const id = c.model_id as string;
      const cur = byModel.get(id) ?? { n: 0, ok: 0, cost: 0, latency: 0 };
      cur.n += 1;
      if (c.status === 'success') cur.ok += 1;
      cur.cost += Number(c.cost_usd ?? 0);
      cur.latency += Number(c.latency_ms ?? 0);
      byModel.set(id, cur);
    }

    const ranked = Array.from(byModel.entries())
      .map(([model_id, st]) => ({
        model_id,
        n: st.n,
        success_rate: st.ok / st.n,
        avg_cost: st.cost / st.n,
        avg_latency: st.latency / st.n,
      }))
      .filter((m) => m.n >= 10)
      .sort((a, b) => b.success_rate - a.success_rate || a.avg_cost - b.avg_cost);

    if (ranked.length === 0) return [];

    const proposals: ChangeProposal[] = [];
    const top = ranked[0]!;

    // Promotion proposal for top reliable model
    if (top.success_rate >= 0.95) {
      proposals.push({
        proposal_id: prefixedId('proposal'),
        proposal_kind: 'model_promotion',
        proposer: this.learner_id,
        subject_kind: this.subject_kind,
        subject_id: top.model_id,
        severity: severityFromImpact(top.success_rate - 0.9, false),
        current_state: { preferred: false, observed: top },
        proposed_state: { preferred: true, capability_bindings_boost: true, observed: top },
        evidence: {
          sample_size: top.n,
          success_rate: top.success_rate,
          avg_cost_usd: top.avg_cost,
          avg_latency_ms: top.avg_latency,
          window_kind: window.kind,
        },
        expected_impact: {
          quality_delta: Number((top.success_rate - 0.9).toFixed(4)),
          cost_delta_usd_per_call: 0,
          latency_delta_ms: 0,
          safety_delta: 0,
        },
        risk: {
          severity: 'LOW',
          reversible: true,
          blast_radius: 'LIMITED',
          notes: 'Registry preferred flag only',
        },
        required_approvers: ['domain_director'],
        shadow_duration_hours: 72,
        rollout_plan: {
          stages: [
            { traffic_percent: 10, minimum_duration_hours: 24 },
            { traffic_percent: 50, minimum_duration_hours: 48 },
            { traffic_percent: 100, minimum_duration_hours: 24 },
          ],
          rollback_criteria: 'success_rate < 0.9 over 1h',
        },
        status: 'pending_review',
        created_at: new Date().toISOString(),
      });
    }

    // Deprecation candidates: poor reliability
    for (const m of ranked) {
      if (m.success_rate < 0.8 && m.n >= 15) {
        proposals.push({
          proposal_id: prefixedId('proposal'),
          proposal_kind: 'model_deprecation',
          proposer: this.learner_id,
          subject_kind: this.subject_kind,
          subject_id: m.model_id,
          severity: 'moderate',
          current_state: { active: true, observed: m },
          proposed_state: { deprecated: true, exclude_from_routing: true, observed: m },
          evidence: {
            sample_size: m.n,
            success_rate: m.success_rate,
            avg_cost_usd: m.avg_cost,
            window_kind: window.kind,
          },
          expected_impact: {
            quality_delta: Number((0.9 - m.success_rate).toFixed(4)),
            cost_delta_usd_per_call: 0,
            latency_delta_ms: 0,
            safety_delta: 0,
          },
          risk: {
            severity: 'MEDIUM',
            reversible: true,
            blast_radius: 'LIMITED',
            notes: 'Requires support comms if customer-visible',
          },
          required_approvers: ['domain_director', 'support_lead'],
          shadow_duration_hours: 48,
          rollout_plan: {
            stages: [
              { traffic_percent: 50, minimum_duration_hours: 24, note: 'reduce traffic' },
              { traffic_percent: 0, minimum_duration_hours: 24, note: 'full exclude' },
            ],
            rollback_criteria: 'capacity shortage on remaining providers',
          },
          status: 'pending_review',
          created_at: new Date().toISOString(),
        });
      }
    }

    return proposals;
  }
}
