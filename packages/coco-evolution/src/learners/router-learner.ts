import { prefixedId } from '@coco/common';
import type { ChangeProposal } from '@coco/protocol';
import { Learner, type LearnerContext, severityFromImpact } from './base';

/**
 * RouterLearner (Deep Spec 9 §6.1)
 * Maintains Beta posteriors per (capability, model) and proposes
 * updated routing weights / preferred model orderings.
 *
 * Prior: Beta(2, 2)
 * Success signals: verification pass, critic score >= threshold, outcome SUCCESS
 */
export class RouterLearner extends Learner {
  readonly subject_kind = 'router_policy';
  readonly learner_id = 'router_learner_v1';

  async analyze(ctx: LearnerContext): Promise<ChangeProposal[]> {
    const { supabase, window } = ctx;

    // Pull recent outcome records with quality + routing context
    const { data: outcomes, error } = await supabase
      .schema('evolution')
      .from('outcome_records')
      .select('outcome_label, automated_quality_score, routing_decisions, resources, domain')
      .gte('finalized_at', window.start.toISOString())
      .lte('finalized_at', window.end.toISOString())
      .limit(500);

    if (error || !outcomes || outcomes.length < 5) {
      // Insufficient sample — no proposal
      return [];
    }

    // Aggregate success/failure per model_id found in routing_decisions or resources
    const stats = new Map<string, { s: number; f: number; qualitySum: number; n: number }>();

    for (const o of outcomes) {
      const modelIds = extractModelIds(o);
      const success = o.outcome_label === 'SUCCESS' || (o.automated_quality_score ?? 0) >= 0.85;
      for (const mid of modelIds) {
        const cur = stats.get(mid) ?? { s: 0, f: 0, qualitySum: 0, n: 0 };
        if (success) cur.s += 1;
        else cur.f += 1;
        cur.qualitySum += o.automated_quality_score ?? (success ? 0.9 : 0.3);
        cur.n += 1;
        stats.set(mid, cur);
      }
    }

    if (stats.size === 0) return [];

    // Build posteriors: Beta(2+S, 2+F)
    const posteriors: Record<string, { alpha: number; beta: number; mean: number; n: number; avg_quality: number }> = {};
    let bestModel = '';
    let bestMean = -1;

    for (const [modelId, st] of stats.entries()) {
      const alpha = 2 + st.s;
      const beta = 2 + st.f;
      const mean = alpha / (alpha + beta);
      posteriors[modelId] = {
        alpha,
        beta,
        mean,
        n: st.n,
        avg_quality: st.n > 0 ? st.qualitySum / st.n : 0,
      };
      if (mean > bestMean && st.n >= 3) {
        bestMean = mean;
        bestModel = modelId;
      }
    }

    if (!bestModel) return [];

    // Rank models by posterior mean
    const ranked = Object.entries(posteriors)
      .sort((a, b) => b[1].mean - a[1].mean)
      .map(([id]) => id);

    const qualityDelta = (posteriors[bestModel]?.avg_quality ?? 0.85) - 0.8;
    const sampleSize = outcomes.length;

    // Exploration ε shrinks with observations
    const epsilon = Math.max(0.02, Math.min(0.15, 1.0 / (1.0 + Math.log(1 + sampleSize))));

    const proposal: ChangeProposal = {
      proposal_id: prefixedId('proposal'),
      proposal_kind: 'router_policy',
      proposer: this.learner_id,
      subject_kind: this.subject_kind,
      subject_id: 'global_router',
      severity: severityFromImpact(qualityDelta, false),
      current_state: {
        preferred_order: ranked.slice(0, 3),
        note: 'baseline inferred from recent outcomes',
      },
      proposed_state: {
        preferred_order: ranked,
        posteriors,
        exploration_epsilon: epsilon,
        primary_model: bestModel,
        utility_weights: {
          // QualityFloor=GOOD defaults from Deep Spec 4
          quality: 0.35,
          latency: 0.25,
          cost: 0.25,
          availability: 0.15,
        },
      },
      evidence: {
        sample_size: sampleSize,
        window_kind: window.kind,
        window_start: window.start.toISOString(),
        window_end: window.end.toISOString(),
        best_model_mean: bestMean,
        models_observed: stats.size,
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
        notes: 'Router preference reorder only; fallback chain preserved',
      },
      required_approvers: qualityDelta >= 0.1 ? ['platform_engineering_lead'] : [],
      shadow_duration_hours: 24,
      rollout_plan: {
        stages: [
          { traffic_percent: 5, minimum_duration_hours: 4 },
          { traffic_percent: 25, minimum_duration_hours: 12 },
          { traffic_percent: 100, minimum_duration_hours: 24 },
        ],
        rollback_criteria: 'quality drop > 10% in 15min OR any safety event',
      },
      status: 'pending_review',
      created_at: new Date().toISOString(),
    };

    return [proposal];
  }
}

function extractModelIds(outcome: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const routing = outcome['routing_decisions'];
  if (Array.isArray(routing)) {
    for (const r of routing) {
      if (r && typeof r === 'object' && 'model_id' in r && typeof (r as any).model_id === 'string') {
        ids.add((r as any).model_id);
      }
      if (r && typeof r === 'object' && 'selected_model_id' in r && typeof (r as any).selected_model_id === 'string') {
        ids.add((r as any).selected_model_id);
      }
    }
  }
  const resources = outcome['resources'];
  if (resources && typeof resources === 'object' && 'model_id' in (resources as object)) {
    const mid = (resources as any).model_id;
    if (typeof mid === 'string') ids.add(mid);
  }
  // Default observation bucket if no model tagged
  if (ids.size === 0) ids.add('unknown/default');
  return Array.from(ids);
}

