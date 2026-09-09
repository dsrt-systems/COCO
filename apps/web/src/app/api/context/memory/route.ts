import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { MemoryWriteInput, MemoryQuery } from '@coco/protocol';
import { writeMemory, retrieveMemories, listMemories } from '@coco/context';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = MemoryWriteInput.parse(body);

    const result = await writeMemory(
      {
        supabase: client,
        organizationId,
        userId: user.id,
      },
      parsed
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Write memory failed';
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
    const queryParam = searchParams.get('q');
    const scopeParam = searchParams.get('scope');
    const projectId = searchParams.get('project_id');
    const missionId = searchParams.get('mission_id');

    const env = { supabase: client, organizationId, userId: user.id };

    if (queryParam) {
      const query = MemoryQuery.parse({
        text_query: queryParam,
        vector_query: queryParam,
        scopes: scopeParam ? [scopeParam] : undefined,
        project_id: projectId,
        mission_id: missionId,
        limit: 20,
      });

      const memories = await retrieveMemories(env, query);
      return NextResponse.json({ query: queryParam, count: memories.length, memories });
    } else {
      const memories = await listMemories(env, {
        scope: scopeParam ?? undefined,
        project_id: projectId ?? undefined,
        mission_id: missionId ?? undefined,
        limit: 50,
      });
      return NextResponse.json({ count: memories.length, memories });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Memory search failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
