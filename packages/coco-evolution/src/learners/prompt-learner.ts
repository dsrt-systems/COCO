import { prefixedId } from '@coco/common';
import type { ChangeProposal } from '@coco/protocol';
import { Learner, type LearnerContext, severityFromImpact } from './base';

/**
 * PromptLearner (Deep Spec 9 §6.2)
 * Detects when a candidate prompt template version wins over baseline
 * via paired outcome quality comparison. Requires 95% CI lower bound > 0
 * for PROMOTION_ELIGIBLE (simplified bootstrap here).
 */
export class PromptLearner extends Learner {
  readonly subject_kind = 'prompt_template';
  readonly learner_id = 'prompt_learner_v1';

  async analyze(ctx: LearnerContext): Promise<ChangeProposal[]> {
    const { supabase, window } = ctx;

    const { data: outcomes, error } = await supabase
      .schema('evolution')
      .from('outcome_records')
      .select('outcome_label, automated_quality_score, prompt_versions, domain')
      .gte('finalized_at', window.start.toISOString())
      .lte('finalized_at', window.end.toISOString())
      .limit(500);

    if (error || !outcomes || outcomes.length < 10) return [];

    // Group by prompt template version tags when present
    const byVersion = new Map<string, number[]>();
    for (const o of outcomes) {
      const versions = extractPromptVersions(o);
      const score = o.automated_quality_score ?? (o.outcome_label === 'SUCCESS' ? 0.9 : 0.4);
      for (const v of versions) {
        const arr = byVersion.get(v) ?? [];
        arr.push(score);
        byVersion.set(v, arr);
      }
    }

    if (byVersion.size < 2) {
      // No A/B contrast — emit informational hold proposal only if single candidate exists
      return [];
    }

    const ranked = Array.from(byVersion.entries())
      .map(([version, scores]) => ({
        version,
        n: scores.length,
        mean: mean(scores),
        std: std(scores),
      }))
      .filter((x) => x.n >= 5)
      .sort((a, b) => b.mean - a.mean);

    if (ranked.length < 2) return [];

    const candidate = ranked[0]!;
    const baseline = ranked[1]!;
    const delta = candidate.mean - baseline.mean;

    // Approximate 95% CI for difference of means
    const se = Math.sqrt(
      (candidate.std ** 2) / candidate.n + (baseline.std ** 2) / baseline.n
    );
    const ciLow = delta - 1.96 * se;
    const ciHigh = delta + 1.96 * se;

    // Only propose if CI lower bound > 0 (candidate wins)
    if (ciLow <= 0) return [];

    const proposal: ChangeProposal = {
      proposal_id: prefixedId('proposal'),
      proposal_kind: 'prompt_promotion',
      proposer: this.learner_id,
      subject_kind: this.subject_kind,
      subject_id: candidate.version.split('@')[0] ?? candidate.version,
      severity: severityFromImpact(delta, false),
      current_state: {
        active_version: baseline.version,
        mean_quality: baseline.mean,
        n: baseline.n,
      },
      proposed_state: {
        active_version: candidate.version,
        mean_quality: candidate.mean,
        n: candidate.n,
      },
      evidence: {
        sample_size: candidate.n + baseline.n,
        win_rate_delta: Number(delta.toFixed(4)),
        ci_95_low: Number(ciLow.toFixed(4)),
        ci_95_high: Number(ciHigh.toFixed(4)),
        window_kind: window.kind,
        window_start: window.start.toISOString(),
        window_end: window.end.toISOString(),
      },
      expected_impact: {
        quality_delta: Number(delta.toFixed(4)),
        cost_delta_usd_per_call: 0,
        latency_delta_ms: 0,
        safety_delta: 0,
      },
      risk: {
        severity: 'LOW',
        reversible: true,
        blast_radius: 'LIMITED',
        notes: 'Prompt version pin change; rollback is one-line',
      },
      required_approvers: delta >= 0.05 ? ['domain_director'] : [],
      shadow_duration_hours: 48,
      rollout_plan: {
        stages: [
          { traffic_percent: 10, minimum_duration_hours: 24 },
          { traffic_percent: 50, minimum_duration_hours: 24 },
          { traffic_percent: 100, minimum_duration_hours: 24 },
        ],
        rollback_criteria: 'candidate quality CI upper bound < 0 vs baseline',
      },
      status: 'pending_review',
      created_at: new Date().toISOString(),
    };

    return [proposal];
  }
}

function extractPromptVersions(o: Record<string, unknown>): string[] {
  const raw = o['prompt_versions'];
  if (!Array.isArray(raw) || raw.length === 0) return ['default@baseline'];
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object' && 'version' in v) out.push(String((v as any).version));
    else if (v && typeof v === 'object' && 'template_version' in v) out.push(String((v as any).template_version));
  }
  return out.length > 0 ? out : ['default@baseline'];
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0.1;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

