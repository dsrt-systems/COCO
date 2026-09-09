import type { SupabaseClient } from '@supabase/supabase-js';
import { ProposalEngine, type ProposalEngineResult } from './proposals/engine.js';
import { PolicyBundleBuilder, type PublishedBundle } from './bundle/builder.js';
import type { DriftAlert } from './drift/index.js';

export interface NightlyEvolutionReport {
  ran_at: string;
  proposals: ProposalEngineResult;
  bundle: PublishedBundle | null;
  drift_alerts: DriftAlert[];
}

/**
 * NightlyEvolutionJob (Deep Spec 9 §5.2 + §12)
 * 1. Run all learners → proposals
 * 2. Detect drift
 * 3. Build signed policy bundle from approved proposals
 */
export class NightlyEvolutionJob {
  private engine: ProposalEngine;
  private bundles: PolicyBundleBuilder;

  constructor(private readonly supabase: SupabaseClient) {
    this.engine = new ProposalEngine(supabase);
    this.bundles = new PolicyBundleBuilder(supabase);
  }

  async run(organizationId?: string): Promise<NightlyEvolutionReport> {
    const proposals = await this.engine.runNightly(organizationId);

    let bundle: PublishedBundle | null = null;
    try {
      // Only build a bundle if there is at least one approved/active proposal already,
      // or if this run produced nothing new — still publish a snapshot when approved exist.
      const { data: approved } = await this.supabase
        .schema('evolution')
        .from('change_proposals')
        .select('proposal_id')
        .in('status', ['approved', 'active'])
        .limit(1);

      if (approved && approved.length > 0) {
        bundle = await this.bundles.buildFromApproved({
          note: `Nightly bundle @ ${new Date().toISOString()}`,
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[coco/evolution] Bundle publish failed:', err);
    }

    return {
      ran_at: new Date().toISOString(),
      proposals,
      bundle,
      drift_alerts: proposals.drift_alerts,
    };
  }
}
