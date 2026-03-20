export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PRICING, getPlanExpiry, type PlanKey } from '@/lib/config/pricing';

const VALID_PLANS: PlanKey[] = ['pro_monthly', 'pro_quarterly', 'pro_annual'];

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return new NextResponse('Server misconfigured', { status: 500 });

  const rawBody = await req.text();
  const sigHeader = req.headers.get('stripe-signature') ?? '';

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sigHeader, webhookSecret);
  } catch (err: any) {
    return new NextResponse(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};
    const userId = metadata.user_id;
    const plan = metadata.plan as PlanKey;

    if (!userId || !plan || !VALID_PLANS.includes(plan)) {
      return new NextResponse('Invalid metadata', { status: 400 });
    }

    // Amount verification — skip if amount_total is null (e.g. trials)
    const expectedAmount = PRICING[plan]['intl']?.amount;
    if (expectedAmount && session.amount_total != null && session.amount_total !== expectedAmount) {
      return new NextResponse('Amount mismatch', { status: 400 });
    }

    // Verify user exists
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (!profile) return new NextResponse('User not found', { status: 400 });

    const paymentId = session.id;

    // Idempotency
    const { data: existing } = await supabase.from('payments').select('id').eq('gateway_payment_id', paymentId).maybeSingle();
    if (existing) return NextResponse.json({ received: true });

    await supabase.from('payments').insert({
      user_id: userId,
      gateway: 'stripe',
      gateway_payment_id: paymentId,
      gateway_subscription_id: session.subscription as string ?? null,
      amount: session.amount_total ?? 0,
      currency: 'USD',
      plan: plan as Exclude<PlanKey, 'free'>,
      status: 'succeeded',
      metadata: { event_type: event.type },
    });

    await supabase.from('profiles').update({
      plan,
      plan_expires_at: getPlanExpiry(plan).toISOString(),
      payment_gateway: 'stripe',
      gateway_customer_id: session.customer as string ?? null,
      gateway_subscription_id: session.subscription as string ?? null,
    }).eq('id', userId);

  } else if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = (invoice.parent?.subscription_details?.subscription ?? '') as string;
    if (!subscriptionId) return NextResponse.json({ received: true });

    const { data: profile } = await supabase.from('profiles').select('id, plan').eq('gateway_subscription_id', subscriptionId).single();
    if (!profile) return NextResponse.json({ received: true });

    // Idempotency
    const paymentId = invoice.id;
    const { data: existing } = await supabase.from('payments').select('id').eq('gateway_payment_id', paymentId).maybeSingle();
    if (!existing) {
      const plan = profile.plan as Exclude<PlanKey, 'free'>;
      await supabase.from('payments').insert({
        user_id: profile.id,
        gateway: 'stripe',
        gateway_payment_id: paymentId,
        gateway_subscription_id: subscriptionId,
        amount: invoice.amount_paid,
        currency: 'USD',
        plan,
        status: 'succeeded',
        metadata: { event_type: event.type },
      });
    }

    // Extend expiry
    await supabase.from('profiles').update({
      plan_expires_at: getPlanExpiry(profile.plan as PlanKey).toISOString(),
    }).eq('id', profile.id);

  } else if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = (invoice.parent?.subscription_details?.subscription ?? '') as string;
    if (!subscriptionId) return NextResponse.json({ received: true });

    const { data: profile } = await supabase.from('profiles').select('id, plan').eq('gateway_subscription_id', subscriptionId).single();
    if (!profile) return NextResponse.json({ received: true });

    const paymentId = invoice.id + '_failed';
    const { data: existing } = await supabase.from('payments').select('id').eq('gateway_payment_id', paymentId).maybeSingle();
    if (!existing) {
      await supabase.from('payments').insert({
        user_id: profile.id,
        gateway: 'stripe',
        gateway_payment_id: paymentId,
        gateway_subscription_id: subscriptionId,
        amount: invoice.amount_due,
        currency: 'USD',
        plan: profile.plan as Exclude<PlanKey, 'free'>,
        status: 'failed',
        metadata: { event_type: event.type },
      });
    }
    // Grace period: do NOT immediately downgrade

  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;

    await supabase.from('profiles').update({
      plan: 'free',
      plan_expires_at: null,
      payment_gateway: null,
      gateway_customer_id: null,
      gateway_subscription_id: null,
    }).eq('gateway_subscription_id', subscription.id);
  }

  return NextResponse.json({ received: true });
}
