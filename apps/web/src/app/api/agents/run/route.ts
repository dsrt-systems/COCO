import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { AgentRegistry, AgentRuntimeExecutor, CORE_GOVERNANCE_AGENTS } from '@coco/intelligence';
import { assertOrgCanSpend } from '@coco/billing';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await assertOrgCanSpend(client, organizationId, {
        estimated_cost_usd: 0.02,
        requires_frontier: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tier limit exceeded';
      return NextResponse.json({ error: msg, code: (err as any)?.code }, { status: 402 });
    }

    const body = await req.json();
    const { mission_id, task_id, agent_id, objective } = body;

    if (!mission_id || !task_id || !agent_id || !objective) {
      return NextResponse.json(
        { error: 'mission_id, task_id, agent_id, and objective are required' },
        { status: 400 }
      );
    }

    const registry = new AgentRegistry(client);
    for (const agentDef of CORE_GOVERNANCE_AGENTS) {
      await registry.register(agentDef);
    }

    const executor = new AgentRuntimeExecutor(client, registry);
    const report = await executor.executeRun({
      mission_id,
      task_id,
      agent_id,
      objective,
      organization_id: organizationId,
      user_id: user.id,
    });

    return NextResponse.json({ report }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Agent run failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
