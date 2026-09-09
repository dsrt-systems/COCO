import { NextResponse } from 'next/server';
import { getSession } from '@/lib/coco/security/context';
import { createServiceClient } from '@/lib/supabase/service';
import { ProjectBrain } from '@coco/context';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const projectId = url.searchParams.get('project_id');
  
  const supabase = createServiceClient();
  const brain = new ProjectBrain(supabase, session.organization_id);

  if (!projectId) {
    // Return all nodes across org for demo purposes if no project specified
    const { data } = await supabase
      .schema('brain')
      .from('knowledge_nodes')
      .select('*')
      .eq('organization_id', session.organization_id)
      .limit(100);
    return NextResponse.json({ ok: true, nodes: data ?? [], edges: [] });
  }

  const graph = await brain.getGraph(projectId);
  return NextResponse.json({ ok: true, ...graph });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const supabase = createServiceClient();
  const brain = new ProjectBrain(supabase, session.organization_id);

  // In a real flow, project_id is strictly resolved. We use a mock default for Phase 6.
  const projectId = body.project_id || `prj_default_${session.organization_id.substring(4, 12)}`;

  try {
    const node = await brain.addNode(
      projectId,
      body.type ?? 'concept',
      body.label,
      body.description,
      'user_input'
    );
    return NextResponse.json({ ok: true, node });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
