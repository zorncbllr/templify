import { PRICING, type PlanKey } from '@/lib/config/pricing';
import { createCheckoutSession as paymongoCheckout } from './paymongo';
import { createStripeCheckoutSession } from './stripe';

type PaymentMethod = 'gcash' | 'maya' | 'card';

interface RoutePaymentParams {
  plan: PlanKey;
  paymentMethod: PaymentMethod;
  locale: 'ph' | 'intl';
  userId: string;
  userEmail: string;
}

interface RoutePaymentResult {
  gateway: 'paymongo' | 'stripe';
  checkoutUrl: string;
  sessionId: string;
}

export async function routePayment(params: RoutePaymentParams): Promise<RoutePaymentResult> {
  const { plan, paymentMethod, locale, userId, userEmail } = params;

  // quarterly only available for PH
  if (plan === 'pro_quarterly' && locale === 'intl') {
    throw new Error('Quarterly plan not available for international users');
  }

  // e-wallets only for PH
  if ((paymentMethod === 'gcash' || paymentMethod === 'maya') && locale === 'intl') {
    throw new Error('GCash and Maya are only available for Philippines users');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error('Missing NEXT_PUBLIC_APP_URL environment variable');

  const successUrl = `${appUrl}/payment-success`;
  const cancelUrl = `${appUrl}/pricing`;

  // Card + intl → Stripe
  if (paymentMethod === 'card' && locale === 'intl') {
    if (plan === 'pro_quarterly') throw new Error('Quarterly plan not available for international users');
    const { url: checkoutUrl, sessionId } = await createStripeCheckoutSession({
      plan: plan as 'pro_monthly' | 'pro_annual',
      userId,
      userEmail,
      successUrl,
      cancelUrl,
    });
    return { gateway: 'stripe', checkoutUrl, sessionId };
  }

  // gcash, maya, or card+ph → PayMongo
  const pricing = PRICING[plan][locale];
  if (!pricing) throw new Error(`Plan ${plan} not available in ${locale}`);

  const methodTypes: ('gcash' | 'maya' | 'card')[] = paymentMethod === 'card'
    ? ['card']
    : [paymentMethod];

  const { checkoutUrl, sessionId } = await paymongoCheckout({
    amount: pricing.amount,
    currency: pricing.currency,
    lineItemName: `Templify Pro (${plan.replace('_', ' ')})`,
    paymentMethodTypes: methodTypes,
    successUrl,
    cancelUrl,
    metadata: { user_id: userId, plan },
  });

  return { gateway: 'paymongo', checkoutUrl, sessionId };
}
