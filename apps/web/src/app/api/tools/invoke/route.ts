import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { ToolDispatcher } from '@coco/execution';
import { ToolInvocationRequest } from '@coco/protocol';
import { assertOrgCanSpend, meterToolInvocation } from '@coco/billing';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await assertOrgCanSpend(client, organizationId, { estimated_cost_usd: 0.01 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tier limit exceeded';
      return NextResponse.json({ error: msg, code: (err as any)?.code }, { status: 402 });
    }

    const body = await req.json();
    const parsedRequest = ToolInvocationRequest.parse(body);

    const dispatcher = new ToolDispatcher({
      supabase: client,
      organizationId,
    });

    const result = await dispatcher.dispatch(parsedRequest);

    if (result.wall_time_ms > 0) {
      await meterToolInvocation(client, {
        organizationId,
        missionId: parsedRequest.mission_id,
        userId: user.id,
        toolId: parsedRequest.tool_id,
        wallTimeMs: result.wall_time_ms,
      });
    }

    const status = result.status === 'success' ? 200 : 400;
    return NextResponse.json({ result }, { status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Tool invocation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
