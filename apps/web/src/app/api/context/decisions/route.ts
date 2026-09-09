import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { DecisionInput } from '@coco/protocol';
import { recordDecision } from '@coco/context';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = DecisionInput.parse(body);

    const decision = await recordDecision(
      {
        supabase: client,
        organizationId,
        userId: user.id,
      },
      parsed
    );

    return NextResponse.json({ decision }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Record decision failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');

    let q = client
      .schema('agents')
      .from('decisions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (projectId) q = q.eq('project_id', projectId);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    return NextResponse.json({ count: data?.length ?? 0, decisions: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'List decisions failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
