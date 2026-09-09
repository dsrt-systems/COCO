import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { StripeService } from '@coco/billing';
import { z } from 'zod';

const CheckoutSchema = z.object({
  tier: z.enum(['pro', 'ranger', 'enterprise']),
  return_url: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const { client, user, organizationId } = await createServerSupabase();
    if (!user || !organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CheckoutSchema.parse(body);

    const baseUrl =
      (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_APP_URL']) ||
      'http://localhost:3000';

    const returnUrl = parsed.return_url ?? `${baseUrl}/billing`;

    const stripe = new StripeService(client);
    const checkoutUrl = await stripe.createCheckoutSession(
      organizationId,
      parsed.tier,
      returnUrl
    );

    return NextResponse.json({ url: checkoutUrl }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout initiation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
