import Stripe from 'stripe';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  return new Stripe(key);
}

export interface StripeCheckoutParams {
  plan: 'pro_monthly' | 'pro_annual';
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createStripeCheckoutSession(params: StripeCheckoutParams): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripeClient();

  const priceId = params.plan === 'pro_monthly'
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_ANNUAL;

  if (!priceId) throw new Error(`Missing Stripe price ID for plan ${params.plan}`);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.userEmail,
    metadata: { user_id: params.userId, plan: params.plan },
  });

  if (!session.url) throw new Error('Stripe session URL is null');
  return { url: session.url, sessionId: session.id };
}

export function getStripeClient_exported(): Stripe {
  return getStripeClient();
}
