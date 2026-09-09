import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prefixedId } from '@coco/common';

/**
 * POST /api/billing/webhook
 * Stripe Webhook Handler for invoice.payment_succeeded and customer.subscription.updated
 */
export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    let event: any;

    try {
      event = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const eventType = event.type ?? 'checkout.session.completed';
    const session = event.data?.object ?? event;
    const organizationId = session.client_reference_id ?? session.metadata?.organization_id;

    if (!organizationId) {
      // Return 200 to acknowledge webhook even if unmapped org
      return NextResponse.json({ received: true, note: 'unmapped_org' });
    }

    const { client } = await createServerSupabase();

    if (eventType === 'checkout.session.completed' || eventType === 'customer.subscription.created') {
      const subscriptionId = prefixedId('subscription' as any);
      const tier = session.metadata?.tier ?? 'pro';
      const monthlyCredits = tier === 'ranger' ? 500.0 : tier === 'enterprise' ? 10000.0 : 100.0;
      const priceUsd = tier === 'ranger' ? 299.0 : tier === 'enterprise' ? 2499.0 : 49.0;

      await client
        .schema('billing')
        .from('subscriptions')
        .upsert({
          subscription_id: subscriptionId,
          organization_id: organizationId,
          tier,
          status: 'active',
          monthly_price_usd: priceUsd,
          compute_credits_monthly: monthlyCredits,
          external_provider: 'stripe',
          external_customer_id: session.customer ?? null,
          external_subscription_id: session.subscription ?? null,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
