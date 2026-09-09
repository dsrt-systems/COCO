import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { AgentRegistry, DatasheetBuilder } from '@coco/intelligence';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const registry = new AgentRegistry(client);
    
    const definition = await registry.get(id);
    if (!definition) {
      return NextResponse.json({ error: 'Specialist not found' }, { status: 404 });
    }

    const builder = new DatasheetBuilder(client);
    const datasheet = await builder.build(definition);

    return NextResponse.json({ definition, datasheet });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get specialist datasheet';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
