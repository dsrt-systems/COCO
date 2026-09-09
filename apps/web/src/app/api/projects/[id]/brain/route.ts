import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prefixedId } from '@coco/common';
import { z } from 'zod';

const CreateNodeSchema = z.object({
  node_type: z.string().min(1),
  label: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  properties: z.record(z.unknown()).default({}),
  origin_source: z.string().default('user'),
  origin_ref: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.8),
});

const CreateEdgeSchema = z.object({
  from_node_id: z.string(),
  to_node_id: z.string(),
  relation: z.string().min(1),
  properties: z.record(z.unknown()).default({}),
  confidence: z.number().min(0).max(1).default(0.9),
  origin_source: z.string().default('user'),
  origin_ref: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const nodeType = searchParams.get('node_type');

    let nodesQ = client
      .schema('brain')
      .from('knowledge_nodes')
      .select('node_id, node_type, label, description, properties, confidence, origin_source, status, created_at')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(500);

    if (nodeType) nodesQ = nodesQ.eq('node_type', nodeType);

    const [nodesRes, edgesRes, brainRes] = await Promise.all([
      nodesQ,
      client
        .schema('brain')
        .from('knowledge_edges')
        .select('edge_id, from_node_id, to_node_id, relation, properties, confidence, status')
        .eq('organization_id', organizationId)
        .eq('project_id', projectId)
        .eq('status', 'active')
        .limit(1000),
      client
        .schema('brain')
        .from('project_brain')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle(),
    ]);

    if (nodesRes.error) throw new Error(nodesRes.error.message);
    if (edgesRes.error) throw new Error(edgesRes.error.message);

    return NextResponse.json({
      nodes: nodesRes.data ?? [],
      edges: edgesRes.data ?? [],
      summary: brainRes.data ?? null,
      counts: {
        nodes: nodesRes.data?.length ?? 0,
        edges: edgesRes.data?.length ?? 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load brain graph';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json();
    const kind = body.kind as 'node' | 'edge';

    if (kind === 'edge') {
      const parsed = CreateEdgeSchema.parse(body);
      const edgeId = prefixedId('edge');
      const { data, error } = await client
        .schema('brain')
        .from('knowledge_edges')
        .insert({
          edge_id: edgeId,
          organization_id: organizationId,
          project_id: projectId,
          from_node_id: parsed.from_node_id,
          to_node_id: parsed.to_node_id,
          relation: parsed.relation,
          properties: parsed.properties,
          confidence: parsed.confidence,
          origin_source: parsed.origin_source,
          origin_ref: parsed.origin_ref ?? null,
          status: 'active',
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ edge: data }, { status: 201 });
    }

    // Default: create node
    const parsed = CreateNodeSchema.parse(body);
    const nodeId = prefixedId('node');
    const { data, error } = await client
      .schema('brain')
      .from('knowledge_nodes')
      .insert({
        node_id: nodeId,
        organization_id: organizationId,
        project_id: projectId,
        node_type: parsed.node_type,
        label: parsed.label,
        description: parsed.description ?? null,
        properties: parsed.properties,
        origin_source: parsed.origin_source,
        origin_ref: parsed.origin_ref ?? null,
        confidence: parsed.confidence,
        status: 'active',
        version: 1,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Touch project_brain summary
    await client
      .schema('brain')
      .from('project_brain')
      .upsert({
        project_id: projectId,
        organization_id: organizationId,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({ node: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to write brain graph';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
