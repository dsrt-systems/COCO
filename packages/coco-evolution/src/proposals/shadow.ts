import { prefixedId } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ShadowVerdictResult {
  shadow_id: string;
  proposal_id: string;
  verdict: 'candidate_wins' | 'baseline_wins' | 'inconclusive' | 'safety_regression';
  baseline_sample_size: number;
  candidate_sample_size: number;
  baseline_quality: number;
  candidate_quality: number;
  quality_delta_mean: number;
}

/**
 * ShadowRunner (Deep Spec 9 §9)
 * Records shadow experiment windows and computes simple verdicts
 * from outcome quality splits tagged baseline vs candidate.
 *
 * Full traffic splitting lives in the Model Router at request time;
 * this module seals results after the shadow window.
 */
export class ShadowRunner {
  constructor(private readonly supabase: SupabaseClient) {}

  async startShadow(proposalId: string): Promise<void> {
    const { error } = await this.supabase
      .schema('evolution')
      .from('change_proposals')
      .update({
        status: 'in_shadow',
        shadow_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('proposal_id', proposalId);

    if (error) throw new Error(error.message);
  }

  /**
   * Seal a shadow window using quality scores provided by the caller
   * (typically from tagged outcome records or dual-execution logs).
   */
  async sealWindow(params: {
    proposalId: string;
    windowStart: Date;
    windowEnd: Date;
    baselineScores: number[];
    candidateScores: number[];
    safetyEventsBaseline?: number;
    safetyEventsCandidate?: number;
  }): Promise<ShadowVerdictResult> {
    const baseline_quality = avg(params.baselineScores);
    const candidate_quality = avg(params.candidateScores);
    const quality_delta_mean = candidate_quality - baseline_quality;

    const safetyBase = params.safetyEventsBaseline ?? 0;
    const safetyCand = params.safetyEventsCandidate ?? 0;

    let verdict: ShadowVerdictResult['verdict'] = 'inconclusive';
    if (safetyCand > safetyBase) {
      verdict = 'safety_regression';
    } else if (params.candidateScores.length >= 5 && params.baselineScores.length >= 5) {
      if (quality_delta_mean > 0.02) verdict = 'candidate_wins';
      else if (quality_delta_mean < -0.02) verdict = 'baseline_wins';
    }

    const shadowId = prefixedId('shadow');

    const { error } = await this.supabase
      .schema('evolution')
      .from('shadow_results')
      .insert({
        shadow_id: shadowId,
        proposal_id: params.proposalId,
        window_start: params.windowStart.toISOString(),
        window_end: params.windowEnd.toISOString(),
        baseline_sample_size: params.baselineScores.length,
        candidate_sample_size: params.candidateScores.length,
        baseline_quality,
        candidate_quality,
        quality_delta_mean,
        verdict,
      });

    if (error) throw new Error(error.message);

    // Update proposal status based on verdict
    if (verdict === 'candidate_wins') {
      await this.supabase
        .schema('evolution')
        .from('change_proposals')
        .update({
          status: 'approved',
          shadow_completed_at: params.windowEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('proposal_id', params.proposalId);
    } else if (verdict === 'safety_regression' || verdict === 'baseline_wins') {
      await this.supabase
        .schema('evolution')
        .from('change_proposals')
        .update({
          status: 'rejected',
          shadow_completed_at: params.windowEnd.toISOString(),
          rollback_reason: `shadow_verdict:${verdict}`,
          updated_at: new Date().toISOString(),
        })
        .eq('proposal_id', params.proposalId);
    } else {
      await this.supabase
        .schema('evolution')
        .from('change_proposals')
        .update({
          shadow_completed_at: params.windowEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('proposal_id', params.proposalId);
    }

    return {
      shadow_id: shadowId,
      proposal_id: params.proposalId,
      verdict,
      baseline_sample_size: params.baselineScores.length,
      candidate_sample_size: params.candidateScores.length,
      baseline_quality,
      candidate_quality,
      quality_delta_mean,
    };
  }
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
