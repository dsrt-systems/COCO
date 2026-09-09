import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { AgentRegistry, CORE_GOVERNANCE_AGENTS, DOMAIN_DIRECTORS, FLAGSHIP_SPECIALISTS } from '@coco/intelligence';

export async function GET(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const registry = new AgentRegistry(client);

    // Bootstrap all tiers (idempotent upserts)
    const allAgents = [
      ...CORE_GOVERNANCE_AGENTS,
      ...DOMAIN_DIRECTORS,
      ...FLAGSHIP_SPECIALISTS,
    ];

    // Seed the database
    for (const agentDef of allAgents) {
      await registry.register(agentDef);
    }

    const { searchParams } = new URL(req.url);
    const tier = searchParams.get('tier') ?? undefined;
    const domain = searchParams.get('domain') ?? undefined;

    const agents = await registry.list({ tier, domain });
    return NextResponse.json({ count: agents.length, agents });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list agents';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
