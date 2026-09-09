import type { MissionPhase } from '@coco/protocol';
import type { MissionRecord, MissionStore } from '@coco/kernel';
import { createServiceClient } from '@/lib/supabase/service';

export function createMissionStore(): MissionStore {
  const supabase = createServiceClient();

  return {
    async insert(mission: MissionRecord): Promise<void> {
      const { error } = await supabase.schema('missions').from('missions').insert({
        mission_id: mission.mission_id,
        organization_id: mission.organization_id,
        project_id: mission.project_id,
        parent_mission_id: mission.parent_mission_id,
        created_by: mission.created_by,
        objective: mission.objective,
        normalized_intent: mission.normalized_intent,
        success_criteria: mission.success_criteria,
        constraints: mission.constraints,
        tier: mission.tier,
        cognitive_depth: mission.cognitive_depth,
        autonomy_level: mission.autonomy_level,
        delivery_mode: mission.delivery_mode,
        deliverable_types: mission.deliverable_types,
        budget: mission.budget,
        usage: mission.usage,
        phase: mission.phase,
        current_step: mission.current_step,
        progress_percent: mission.progress_percent,
        status_summary: mission.status_summary,
        started_at: mission.started_at,
        last_activity_at: mission.last_activity_at,
        estimated_completion_at: mission.estimated_completion_at,
        completed_at: mission.completed_at,
        created_at: mission.created_at,
        updated_at: mission.updated_at,
      });
      if (error) throw error;
    },

    async findById(missionId: string): Promise<MissionRecord | null> {
      const { data, error } = await supabase
        .schema('missions')
        .from('missions')
        .select('*')
        .eq('mission_id', missionId)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToMission(data) : null;
    },

    async listByOrg(organizationId: string, limit = 20): Promise<MissionRecord[]> {
      const { data, error } = await supabase
        .schema('missions')
        .from('missions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToMission);
    },

    async updatePhase(
      missionId: string,
      phase: MissionPhase,
      extras?: {
        progress_percent?: number;
        status_summary?: string;
        current_step?: string;
        started_at?: string;
        completed_at?: string;
      },
    ): Promise<MissionRecord> {
      const patch: Record<string, unknown> = {
        phase,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (extras?.progress_percent !== undefined) patch.progress_percent = extras.progress_percent;
      if (extras?.status_summary !== undefined) patch.status_summary = extras.status_summary;
      if (extras?.current_step !== undefined) patch.current_step = extras.current_step;
      if (extras?.started_at !== undefined) patch.started_at = extras.started_at;
      if (extras?.completed_at !== undefined) patch.completed_at = extras.completed_at;

      const { data, error } = await supabase
        .schema('missions')
        .from('missions')
        .update(patch)
        .eq('mission_id', missionId)
        .select('*')
        .single();
      if (error) throw error;
      return rowToMission(data);
    },
  };
}

function rowToMission(row: any): MissionRecord {
  return {
    mission_id: row.mission_id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    parent_mission_id: row.parent_mission_id,
    created_by: row.created_by,
    objective: row.objective,
    normalized_intent: row.normalized_intent,
    success_criteria: row.success_criteria ?? [],
    constraints: row.constraints ?? [],
    tier: row.tier,
    cognitive_depth: row.cognitive_depth,
    autonomy_level: row.autonomy_level,
    delivery_mode: row.delivery_mode,
    deliverable_types: row.deliverable_types ?? [],
    budget: row.budget ?? {},
    usage: row.usage ?? {
      compute_seconds_used: 0,
      wall_clock_seconds: 0,
      model_tokens_used: 0,
      tool_calls_executed: 0,
      cost_usd_accrued: 0,
    },
    phase: row.phase,
    current_step: row.current_step,
    progress_percent: Number(row.progress_percent ?? 0),
    status_summary: row.status_summary,
    started_at: row.started_at,
    last_activity_at: row.last_activity_at,
    estimated_completion_at: row.estimated_completion_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
