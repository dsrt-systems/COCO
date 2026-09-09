import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { ToolRegistry, seedTools } from '@coco/execution';

export async function GET(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const registry = new ToolRegistry(client);

    // Bootstrap Tier 4 Tools
    await seedTools(registry);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? undefined;

    const tools = await registry.list({ category });
    return NextResponse.json({ count: tools.length, tools });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list tools';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
