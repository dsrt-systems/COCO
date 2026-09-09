import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { ProjectBrain } from '@coco/context';

export async function GET(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id') ?? undefined;

    const brain = new ProjectBrain(client, organizationId);
    const graph = await brain.getGraph(projectId);

    return NextResponse.json({ ok: true, ...graph });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get brain graph';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const brain = new ProjectBrain(client, organizationId);

    if (body.kind === 'edge') {
      const edge = await brain.addEdge({
        project_id: body.project_id ?? 'prj_default',
        from_node_id: body.from_node_id,
        to_node_id: body.to_node_id,
        relation: body.relation ?? 'relates_to',
        organization_id: organizationId,
      });
      return NextResponse.json({ ok: true, edge }, { status: 201 });
    }

    const node = await brain.addNode({
      project_id: body.project_id ?? 'prj_default',
      node_type: body.type ?? body.node_type ?? 'concept',
      label: body.label ?? 'Unlabeled Node',
      description: body.description ?? undefined,
      organization_id: organizationId,
    });

    return NextResponse.json({ ok: true, node }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to write brain graph';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
