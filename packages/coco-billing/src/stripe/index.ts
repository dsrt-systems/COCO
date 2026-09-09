import type { SupabaseClient } from '@supabase/supabase-js';

export class StripeService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Generates a Stripe checkout session URL for upgrading subscription tier.
   */
  async createCheckoutSession(
    organizationId: string,
    tier: 'pro' | 'ranger' | 'enterprise',
    returnUrl: string
  ): Promise<string> {
    const stripeKey = typeof process !== 'undefined' ? process.env['STRIPE_SECRET_KEY'] : undefined;

    if (!stripeKey || stripeKey.length < 10) {
      // Mock fallback URL for dev environments
      return `${returnUrl}?mock_checkout_success=true&tier=${tier}`;
    }

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const priceMap: Record<string, string> = {
      pro: process.env['STRIPE_PRICE_PRO'] ?? 'price_pro_default',
      ranger: process.env['STRIPE_PRICE_RANGER'] ?? 'price_ranger_default',
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceMap[tier] ?? priceMap['pro'],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?canceled=true`,
      client_reference_id: organizationId,
    });

    return session.url ?? returnUrl;
  }
}
