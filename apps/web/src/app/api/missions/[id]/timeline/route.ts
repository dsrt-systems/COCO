import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Fetch Mission
    const { data: mission, error: missionErr } = await client
      .schema('missions')
      .from('missions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('mission_id', id)
      .maybeSingle();

    if (missionErr || !mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // 2. Fetch Tasks
    const { data: tasks } = await client
      .schema('missions')
      .from('tasks')
      .select('*')
      .eq('mission_id', id)
      .order('created_at', { ascending: true });

    // 3. Fetch Agents
    const { data: agents } = await client
      .schema('agents')
      .from('agent_instances')
      .select('*')
      .eq('mission_id', id)
      .order('spawned_at', { ascending: false });

    // 4. Fetch Artifacts
    const { data: artifacts } = await client
      .schema('artifacts')
      .from('artifacts')
      .select('*')
      .eq('mission_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      mission,
      tasks: tasks ?? [],
      agents: agents ?? [],
      artifacts: artifacts ?? [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch timeline';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
