import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { ContextCompileRequest } from '@coco/protocol';
import { compileContext } from '@coco/context';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ContextCompileRequest.parse(body);

    const packet = await compileContext(
      {
        supabase: client,
        organizationId,
        userId: user.id,
      },
      parsed
    );

    return NextResponse.json({ packet }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Context compilation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
