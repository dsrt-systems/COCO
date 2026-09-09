import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { ToolDispatcher } from '@coco/execution';
import { ToolInvocationRequest } from '@coco/protocol';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsedRequest = ToolInvocationRequest.parse(body);

    const dispatcher = new ToolDispatcher({
      supabase: client,
      organizationId,
    });

    const result = await dispatcher.dispatch(parsedRequest);

    const status = result.status === 'success' ? 200 : 400;
    return NextResponse.json({ result }, { status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Tool invocation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
