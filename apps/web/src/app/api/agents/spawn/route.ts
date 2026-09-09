import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { AgentRegistry, DynamicAgentFactory } from '@coco/intelligence';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { domain, objective, parentDirectorId } = body;

    if (!domain || !objective) {
      return NextResponse.json({ error: 'domain and objective are required' }, { status: 400 });
    }

    const registry = new AgentRegistry(client);
    const factory = new DynamicAgentFactory(registry);

    const agent = await factory.spawnSpecialist({
      domain,
      objective,
      parentDirectorId: parentDirectorId ?? 'A1_coco_director',
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Dynamic agent spawn failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
