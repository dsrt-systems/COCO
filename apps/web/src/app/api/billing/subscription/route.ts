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
    const subscription = await guard.getSubscription(organizationId);

    // If no subscription row exists yet, return default baseline
    if (!subscription) {
      return NextResponse.json({
        subscription: {
          tier: 'default',
          status: 'active',
          compute_credits_monthly: 10.0,
        },
      });
    }

    return NextResponse.json({ subscription });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get subscription';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
