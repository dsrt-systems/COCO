import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { MissionSupervisor } from '@coco/kernel/ranger';
import { MissionCharterSchema } from '@coco/protocol';
import { prefixedId } from '@coco/common';
import { assertOrgCanSpend, meterModelInference } from '@coco/billing';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const missionId = body.mission_id ?? prefixedId('mission');
    const maxCost = body.max_cost_usd ?? 25.0;

    // Tier envelope pre-check (parallelism + spend headroom)
    try {
      await assertOrgCanSpend(client, organizationId, {
        estimated_cost_usd: Math.min(1.0, maxCost * 0.05), // small reservation to start
        requires_frontier: body.requires_frontier === true,
        parallel_agents: body.parallel_agents ?? 4,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tier limit exceeded';
      const code = (err as any)?.code ?? 'budget_exhausted';
      return NextResponse.json({ error: msg, code }, { status: 402 });
    }

    const charterInput = {
      charter_id: prefixedId('proposal'), // stable id kind available
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
        max_parallel_agents: body.parallel_agents ?? 4,
        max_model_tokens_total: 1000000,
        max_cost_usd: maxCost,
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
        usage: {
          compute_seconds_used: 0,
          wall_clock_seconds: 0,
          model_tokens_used: 0,
          cost_usd_accrued: 0,
        },
      }, { onConflict: 'mission_id' });

    const supervisor = new MissionSupervisor(client, {
      missionId,
      organizationId,
      charter,
    });

    const result = await supervisor.runMissionLoop();

    // Meter a summary usage line for the mission run cost if present
    if (result.total_cost_usd > 0) {
      await meterModelInference(client, {
        organizationId,
        missionId,
        userId: user.id,
        modelId: 'ranger/mission_rollups',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: result.total_cost_usd,
        provider: 'internal',
      });
    }

    return NextResponse.json({ result, charter }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Ranger mission start failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
