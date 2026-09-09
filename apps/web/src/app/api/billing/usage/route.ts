import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { TierEnvelopeGuard } from '@coco/billing';

export async function GET() {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guard = new TierEnvelopeGuard(client);
    const summary = await guard.getUsageSummary(organizationId);

    return NextResponse.json({ usage: summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get usage summary';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
