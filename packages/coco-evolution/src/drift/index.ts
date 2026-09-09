import type { SupabaseClient } from '@supabase/supabase-js';

export type DriftKind =
  | 'input_distribution'
  | 'model_output'
  | 'tenant_behavior'
  | 'world_fact_staleness';

export interface DriftAlert {
  kind: DriftKind;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  psi?: number;
  evidence: Record<string, unknown>;
  detected_at: string;
}

/**
 * Population Stability Index between two discrete distributions.
 * PSI > 0.25 → significant drift (Deep Spec 9 §7).
 */
export function populationStabilityIndex(
  baseline: Record<string, number>,
  current: Record<string, number>
): number {
  const keys = Array.from(new Set([...Object.keys(baseline), ...Object.keys(current)]));
  let psi = 0;
  const bTotal = Object.values(baseline).reduce((a, b) => a + b, 0) || 1;
  const cTotal = Object.values(current).reduce((a, b) => a + b, 0) || 1;

  for (const k of keys) {
    const b = Math.max(0.0001, (baseline[k] ?? 0) / bTotal);
    const c = Math.max(0.0001, (current[k] ?? 0) / cTotal);
    psi += (c - b) * Math.log(c / b);
  }
  return psi;
}

export class DriftDetector {
  constructor(private readonly supabase: SupabaseClient) {}

  async detectAll(): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];
    const now = new Date();
    const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Input distribution drift: domain mix 24h vs 30d
    const [currentOutcomes, baselineOutcomes] = await Promise.all([
      this.supabase
        .schema('evolution')
        .from('outcome_records')
        .select('domain, cognitive_depth, outcome_label')
        .gte('finalized_at', day.toISOString())
        .limit(500),
      this.supabase
        .schema('evolution')
        .from('outcome_records')
        .select('domain, cognitive_depth, outcome_label')
        .gte('finalized_at', month.toISOString())
        .lt('finalized_at', day.toISOString())
        .limit(2000),
    ]);

    const curDomains = countField(currentOutcomes.data ?? [], 'domain');
    const baseDomains = countField(baselineOutcomes.data ?? [], 'domain');
    if (Object.keys(baseDomains).length > 0 && Object.keys(curDomains).length > 0) {
      const psi = populationStabilityIndex(baseDomains, curDomains);
      if (psi > 0.25) {
        alerts.push({
          kind: 'input_distribution',
          severity: psi > 0.5 ? 'HIGH' : 'MEDIUM',
          message: `Domain mix PSI=${psi.toFixed(3)} exceeds 0.25 threshold`,
          psi,
          evidence: { baseline: baseDomains, current: curDomains },
          detected_at: now.toISOString(),
        });
      }
    }

    // Model output drift proxy: failure rate spike
    const { data: recentCalls } = await this.supabase
      .schema('models')
      .from('model_calls')
      .select('model_id, status')
      .gte('started_at', day.toISOString())
      .limit(1000);

    if (recentCalls && recentCalls.length >= 20) {
      const byModel = new Map<string, { n: number; fail: number }>();
      for (const c of recentCalls) {
        const id = c.model_id as string;
        const cur = byModel.get(id) ?? { n: 0, fail: 0 };
        cur.n += 1;
        if (c.status !== 'success') cur.fail += 1;
        byModel.set(id, cur);
      }
      for (const [modelId, st] of byModel.entries()) {
        const failRate = st.fail / st.n;
        if (st.n >= 15 && failRate > 0.2) {
          alerts.push({
            kind: 'model_output',
            severity: failRate > 0.4 ? 'CRITICAL' : 'HIGH',
            message: `Model ${modelId} failure rate ${(failRate * 100).toFixed(1)}% over 24h`,
            evidence: { model_id: modelId, n: st.n, fail_rate: failRate },
            detected_at: now.toISOString(),
          });
        }
      }
    }

    // World-fact staleness: sources older than 30d dominating
    const { data: sources } = await this.supabase
      .schema('research')
      .from('sources')
      .select('source_id, retrieved_at, credibility_class')
      .limit(500);

    if (sources && sources.length > 0) {
      const stale = sources.filter((s) => {
        if (!s.retrieved_at) return true;
        return now.getTime() - new Date(s.retrieved_at).getTime() > 30 * 24 * 60 * 60 * 1000;
      });
      const ratio = stale.length / sources.length;
      if (ratio > 0.4) {
        alerts.push({
          kind: 'world_fact_staleness',
          severity: ratio > 0.7 ? 'HIGH' : 'MEDIUM',
          message: `${(ratio * 100).toFixed(0)}% of corpus sources are older than 30 days`,
          evidence: { total: sources.length, stale: stale.length, ratio },
          detected_at: now.toISOString(),
        });
      }
    }

    return alerts;
  }
}

function countField(rows: Record<string, unknown>[], field: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const v = String(r[field] ?? 'unknown');
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}
