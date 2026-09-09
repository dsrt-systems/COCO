import { prefixedId } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChangeProposal } from '@coco/protocol';
import { createAllLearners, defaultWindow, type Learner } from '../learners/index.js';
import { DriftDetector, type DriftAlert } from '../drift/index.js';

export interface ProposalEngineResult {
  proposals_created: number;
  proposals_auto_rejected: number;
  proposals: ChangeProposal[];
  rejected: Array<{ proposal: ChangeProposal; reason: string }>;
  drift_alerts: DriftAlert[];
}

/**
 * ProposalEngine (Deep Spec 9 §8)
 * Runs all learners, applies auto-reject rules, persists survivors.
 */
export class ProposalEngine {
  private learners: Learner[];
  private driftDetector: DriftDetector;

  constructor(private readonly supabase: SupabaseClient) {
    this.learners = createAllLearners();
    this.driftDetector = new DriftDetector(supabase);
  }

  async runNightly(organizationId?: string): Promise<ProposalEngineResult> {
    const window = defaultWindow('24h');
    const collected: ChangeProposal[] = [];
    const rejected: Array<{ proposal: ChangeProposal; reason: string }> = [];

    // 1. Drift first (blocks unsafe auto-promotions when critical)
    const driftAlerts = await this.driftDetector.detectAll();
    const criticalDrift = driftAlerts.some((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH');

    // 2. Run learners
    for (const learner of this.learners) {
      try {
        const proposals = await learner.analyze({
          supabase: this.supabase,
          organizationId,
          window,
        });
        collected.push(...proposals);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[coco/evolution] Learner ${learner.learner_id} failed:`, err);
      }
    }

    // 3. Auto-reject structural failures
    const accepted: ChangeProposal[] = [];
    for (const p of collected) {
      const reason = this.autoRejectReason(p, criticalDrift);
      if (reason) {
        rejected.push({ proposal: p, reason });
        // Persist as rejected for audit trail
        await this.persistProposal({ ...p, status: 'rejected' }, reason);
      } else {
        accepted.push(p);
        await this.persistProposal(p);
      }
    }

    return {
      proposals_created: accepted.length,
      proposals_auto_rejected: rejected.length,
      proposals: accepted,
      rejected,
      drift_alerts: driftAlerts,
    };
  }

  private autoRejectReason(p: ChangeProposal, criticalDrift: boolean): string | null {
    const evidence = p.evidence ?? {};
    const sampleSize = Number((evidence as any).sample_size ?? 0);

    if (sampleSize > 0 && sampleSize < 5) {
      return 'sample_size_below_minimum';
    }

    const impact = p.expected_impact ?? {};
    const safetyDelta = Number((impact as any).safety_delta ?? 0);
    if (safetyDelta < 0) {
      return 'safety_metric_regression';
    }

    if (criticalDrift && p.proposal_kind === 'model_promotion') {
      return 'blocked_by_active_drift_incident';
    }

    // Never auto-accept major severity without approvers listed
    if (p.severity === 'major' && (!p.required_approvers || p.required_approvers.length === 0)) {
      return 'major_severity_missing_approvers';
    }

    return null;
  }

  private async persistProposal(p: ChangeProposal, rejectReason?: string): Promise<void> {
    const { error } = await this.supabase
      .schema('evolution')
      .from('change_proposals')
      .upsert({
        proposal_id: p.proposal_id,
        proposal_kind: p.proposal_kind,
        proposer: p.proposer,
        subject_kind: p.subject_kind,
        subject_id: p.subject_id,
        severity: p.severity,
        current_state: p.current_state,
        proposed_state: p.proposed_state,
        evidence: p.evidence,
        expected_impact: p.expected_impact,
        risk: p.risk,
        required_approvers: p.required_approvers,
        shadow_duration_hours: p.shadow_duration_hours,
        rollout_plan: p.rollout_plan,
        status: p.status,
        rollback_reason: rejectReason ?? null,
        created_at: p.created_at,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'proposal_id' });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[coco/evolution] Failed to persist proposal:', error.message);
    }
  }

  async listProposals(filters: { status?: string; kind?: string } = {}): Promise<ChangeProposal[]> {
    let q = this.supabase
      .schema('evolution')
      .from('change_proposals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters.status) q = q.eq('status', filters.status);
    if (filters.kind) q = q.eq('proposal_kind', filters.kind);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ChangeProposal[];
  }

  async decideProposal(
    proposalId: string,
    decision: 'approved' | 'rejected',
    decidedBy: string,
    reason?: string
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      status: decision === 'approved' ? 'approved' : 'rejected',
      approved_by: decidedBy,
      updated_at: new Date().toISOString(),
    };
    if (decision === 'approved') updates.approved_at = new Date().toISOString();
    if (decision === 'rejected') updates.rollback_reason = reason ?? 'rejected_by_human';

    const { error } = await this.supabase
      .schema('evolution')
      .from('change_proposals')
      .update(updates)
      .eq('proposal_id', proposalId);

    if (error) throw new Error(error.message);

    // Auto-start shadow when approved and duration > 0
    if (decision === 'approved') {
      const { data } = await this.supabase
        .schema('evolution')
        .from('change_proposals')
        .select('shadow_duration_hours')
        .eq('proposal_id', proposalId)
        .single();

      if ((data?.shadow_duration_hours ?? 0) > 0) {
        await this.supabase
          .schema('evolution')
          .from('change_proposals')
          .update({
            status: 'in_shadow',
            shadow_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('proposal_id', proposalId);
      }
    }
  }
}
