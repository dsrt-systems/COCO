import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { MissionSupervisor } from '@coco/kernel/ranger';
import { MissionCharterSchema } from '@coco/protocol';
import { prefixedId } from '@coco/common';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const missionId = body.mission_id ?? prefixedId('mission');
    
    // Construct charter
    const charterInput = {
      charter_id: prefixedId('charter' as any),
      mission_id: missionId,
      organization_id: organizationId,
      authorized_by_user_id: user.id,
      authorized_at_unix_ms: Date.now(),
      charter_signature: 'sig_user_authorized',
      objective: body.objective ?? 'Execute autonomous Ranger mission',
      tier: 'ranger' as const,
      autonomy_level: body.autonomy_level ?? 'l3_multistep',
      budget: {
        max_compute_seconds: 3600,
        max_wall_clock_seconds: 86400,
        max_parallel_agents: 4,
        max_model_tokens_total: 1000000,
        max_cost_usd: body.max_cost_usd ?? 25.0,
      },
      scope: {
        allowed_tools: ['d1_browser_automation', 'd2_terminal_exec', 'd3_git_manager', 'd4_db_query'],
        forbidden_tools: [],
        allowed_data_scopes: ['project', 'semantic', 'working'],
        forbidden_data_scopes: [],
        allowed_domains: [],
        may_spawn_dynamic_agents: true,
        may_modify_project_brain: true,
        may_produce_external_outputs: false,
      },
    };

    const charter = MissionCharterSchema.parse(charterInput);

    // Create mission row if not exists
    await client
      .schema('missions')
      .from('missions')
      .upsert({
        mission_id: missionId,
        organization_id: organizationId,
        created_by: user.id,
        objective: charter.objective,
        tier: 'ranger',
        cognitive_depth: 4,
        autonomy_level: charter.autonomy_level,
        delivery_mode: 'checkpointed',
        phase: 'created',
        budget: charter.budget,
        usage: { compute_seconds_used: 0, wall_clock_seconds: 0, model_tokens_used: 0, cost_usd_accrued: 0 },
      }, { onConflict: 'mission_id' });

    // Instantiate & run supervisor
    const supervisor = new MissionSupervisor(client, {
      missionId,
      organizationId,
      charter,
    });

    const result = await supervisor.runMissionLoop();

    return NextResponse.json({ result, charter }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Ranger mission start failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
