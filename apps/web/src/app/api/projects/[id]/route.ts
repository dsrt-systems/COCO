import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const UpdateProjectSchema = z.object({
  display_name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  primary_domain: z.string().nullable().optional(),
  visibility: z.enum(['private', 'organization', 'public']).optional(),
  tech_stack: z.array(z.string()).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  settings: z.record(z.unknown()).optional(),
});

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

    const { data: project, error } = await client
      .schema('projects')
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Fetch related counts
    const [missionsRes, convsRes, brainRes, decisionsRes] = await Promise.all([
      client.schema('missions').from('missions').select('mission_id', { count: 'exact', head: true }).eq('project_id', id),
      client.schema('memory').from('conversations').select('conversation_id', { count: 'exact', head: true }).eq('project_id', id),
      client.schema('brain').from('project_brain').select('*').eq('project_id', id).maybeSingle(),
      client.schema('agents').from('decisions').select('decision_id', { count: 'exact', head: true }).eq('project_id', id),
    ]);

    return NextResponse.json({
      project,
      stats: {
        mission_count: missionsRes.count ?? 0,
        conversation_count: convsRes.count ?? 0,
        decision_count: decisionsRes.count ?? 0,
      },
      brain: brainRes.data ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get project';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateProjectSchema.parse(body);

    const updates: Record<string, unknown> = {
      ...parsed,
      updated_at: new Date().toISOString(),
    };

    if (parsed.status === 'archived') {
      updates.archived_at = new Date().toISOString();
    }

    const { data, error } = await client
      .schema('projects')
      .from('projects')
      .update(updates)
      .eq('organization_id', organizationId)
      .eq('project_id', id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ project: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update project';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Soft-delete
    const { error } = await client
      .schema('projects')
      .from('projects')
      .update({
        status: 'deleted',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('project_id', id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete project';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
