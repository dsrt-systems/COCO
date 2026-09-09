import { prefixedId } from '@coco/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OutcomeRecord } from '@coco/protocol';

export class TelemetryIngestion {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Finalizes a completed mission into a structured OutcomeRecord.
   */
  async finalizeOutcome(missionId: string, organizationId: string): Promise<OutcomeRecord> {
    const outcomeId = prefixedId('evaluation' as any);
    const now = new Date().toISOString();

    // 1. Fetch Mission
    const { data: mission, error: missionErr } = await this.supabase
      .schema('missions')
      .from('missions')
      .select('*')
      .eq('mission_id', missionId)
      .single();

    if (missionErr || !mission) throw new Error(`Mission not found: ${missionId}`);

    // 2. Fetch Tasks & Verification summaries
    const [tasksRes, verificationsRes] = await Promise.all([
      this.supabase.schema('missions').from('tasks').select('status, verification_level').eq('mission_id', missionId),
      this.supabase.schema('verification').from('verifications').select('verdict, highest_level_passed').eq('mission_id', missionId),
    ]);

    const tasks = tasksRes.data ?? [];
    const verifications = verificationsRes.data ?? [];

    const passedVerifications = verifications.filter((v) => v.verdict === 'accepted').length;
    const automatedQualityScore = verifications.length > 0 ? passedVerifications / verifications.length : 0.9;

    const record: OutcomeRecord = {
      outcome_id: outcomeId,
      organization_id: organizationId,
      mission_id: missionId,
      project_id: mission.project_id ?? undefined,
      mission_tier: mission.tier ?? 'default',
      cognitive_depth: mission.cognitive_depth ?? 3,
      domain: 'software',
      outcome_label: mission.phase === 'completed' ? 'SUCCESS' : 'FAILED',
      outcome_confidence: 1.0,
      automated_quality_score: automatedQualityScore,
      execution_summary: {
        total_tasks: tasks.length,
        completed_tasks: tasks.filter((t) => t.status === 'completed').length,
      },
      quality_signals: {
        verifications_run: verifications.length,
        verifications_passed: passedVerifications,
      },
      resources: mission.usage ?? {},
      failure_categories: mission.phase === 'failed' ? ['task_execution_failure'] : [],
      mission_started_at: mission.created_at ?? now,
      mission_completed_at: mission.completed_at ?? now,
      finalized_at: now,
    };

    // 3. Persist to evolution.outcome_records
    await this.supabase
      .schema('evolution')
      .from('outcome_records')
      .upsert({
        outcome_id: record.outcome_id,
        organization_id: record.organization_id,
        mission_id: record.mission_id,
        project_id: record.project_id ?? null,
        mission_tier: record.mission_tier,
        cognitive_depth: record.cognitive_depth,
        domain: record.domain ?? null,
        outcome_label: record.outcome_label,
        outcome_confidence: record.outcome_confidence,
        automated_quality_score: record.automated_quality_score ?? null,
        execution_summary: record.execution_summary,
        quality_signals: record.quality_signals,
        resources: record.resources,
        failure_categories: record.failure_categories,
        mission_started_at: record.mission_started_at,
        mission_completed_at: record.mission_completed_at ?? null,
        finalized_at: record.finalized_at,
      }, { onConflict: 'mission_id' });

    return record;
  }
}
