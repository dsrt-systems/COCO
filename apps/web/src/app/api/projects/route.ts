import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prefixedId } from '@coco/common';
import { z } from 'zod';

const CreateProjectSchema = z.object({
  display_name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(2000).optional(),
  primary_domain: z.string().optional(),
  visibility: z.enum(['private', 'organization', 'public']).default('private'),
  tech_stack: z.array(z.string()).default([]),
});

export async function GET(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? 'active';

    let q = client
      .schema('projects')
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (status !== 'all') {
      q = q.eq('status', status);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    return NextResponse.json({ count: data?.length ?? 0, projects: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list projects';
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
    const parsed = CreateProjectSchema.parse(body);

    const projectId = prefixedId('project');
    const slug = parsed.slug ?? parsed.display_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    const row = {
      project_id: projectId,
      organization_id: organizationId,
      slug,
      display_name: parsed.display_name,
      description: parsed.description ?? null,
      status: 'active',
      visibility: parsed.visibility,
      primary_domain: parsed.primary_domain ?? null,
      tech_stack: parsed.tech_stack,
      settings: {},
      metadata: {},
      created_by: user.id,
    };

    const { data, error } = await client
      .schema('projects')
      .from('projects')
      .insert(row)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Auto-add creator as owner
    await client
      .schema('projects')
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: user.id,
        role: 'owner',
      });

    // Initialize empty Project Brain summary
    await client
      .schema('brain')
      .from('project_brain')
      .upsert({
        project_id: projectId,
        organization_id: organizationId,
        node_counts: {},
        edge_counts: {},
        decision_count: 0,
        requirement_count: 0,
        artifact_count: 0,
        active_risks: [],
        open_questions: [],
        contradictions: [],
      });

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create project';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
