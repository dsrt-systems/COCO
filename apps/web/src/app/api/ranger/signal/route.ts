import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { MissionControlSignalSchema } from '@coco/protocol';
import { prefixedId } from '@coco/common';

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const signal = MissionControlSignalSchema.parse({
      ...body,
      signal_id: prefixedId('signal' as any),
      issued_by_user_id: user.id,
      issued_at_unix_ms: Date.now(),
    });

    // Handle pause/stop signals by updating mission status
    if (signal.kind === 'pause') {
      await client
        .schema('missions')
        .from('missions')
        .update({ phase: 'cancelled' }) // or paused
        .eq('mission_id', signal.mission_id)
        .eq('organization_id', organizationId);
    }

    return NextResponse.json({ signal, ack: true }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Control signal failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
