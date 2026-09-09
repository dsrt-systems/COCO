import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { AgentRegistry, ALL_SPECIALISTS_AND_CRITICS } from '@coco/intelligence';

export async function GET(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const registry = new AgentRegistry(client);

    // Bootstrap all 134 capabilities + critics if not seeded
    // (In production, this is done by a background job, but for dev we ensure it here)
    const { searchParams } = new URL(req.url);
    if (searchParams.get('seed') === 'true') {
      for (const agentDef of ALL_SPECIALISTS_AND_CRITICS) {
        await registry.register(agentDef);
      }
    }

    const domain = searchParams.get('domain') ?? undefined;
    const tier = searchParams.get('tier') ?? 'tier_3_specialist';

    const agents = await registry.list({ tier, domain });
    
    // Don't return critics in the main directory unless asked
    const specialists = agents.filter(a => !a.agent_id.includes('_critic_'));

    return NextResponse.json({ count: specialists.length, specialists });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list specialists';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
