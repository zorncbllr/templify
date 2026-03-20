export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { retrieveCheckoutSession } from '@/lib/payments/paymongo';
import { getPlanExpiry, type PlanKey } from '@/lib/config/pricing';

const VALID_PLANS: PlanKey[] = ['pro_monthly', 'pro_quarterly', 'pro_annual'];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId, gateway } = await req.json() as { sessionId: string; gateway: string };
  if (!sessionId || !gateway) {
    return NextResponse.json({ error: 'Missing sessionId or gateway' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if already upgraded
  const { data: profile } = await admin.from('profiles').select('plan').eq('id', user.id).single();
  if (profile?.plan && profile.plan !== 'free') {
    return NextResponse.json({ plan: profile.plan });
  }

  // Idempotency: check if this session was already processed
  const { data: existingPayment } = await admin
    .from('payments')
    .select('id')
    .eq('gateway_payment_id', sessionId)
    .maybeSingle();
  if (existingPayment) {
    // Payment record exists but plan wasn't updated — re-check profile
    const { data: p } = await admin.from('profiles').select('plan').eq('id', user.id).single();
    return NextResponse.json({ plan: p?.plan ?? 'free' });
  }

  if (gateway === 'paymongo') {
    const session = await retrieveCheckoutSession(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const status = session.attributes?.status;
    if (status !== 'paid' && status !== 'active') {
      return NextResponse.json({ plan: 'free', status });
    }

    const metadata = session.attributes?.metadata ?? {};
    const plan = metadata.plan as string;
    const metaUserId = metadata.user_id as string;

    if (!plan || !VALID_PLANS.includes(plan as PlanKey)) {
      return NextResponse.json({ error: 'Invalid plan in session' }, { status: 400 });
    }

    // Verify the session belongs to this user
    if (metaUserId !== user.id) {
      return NextResponse.json({ error: 'Session does not belong to user' }, { status: 403 });
    }

    const amount =
      session.attributes?.payment_intent?.attributes?.amount
      ?? session.attributes?.line_items?.[0]?.amount
      ?? 0;
    const currency =
      session.attributes?.payment_intent?.attributes?.currency
      ?? session.attributes?.line_items?.[0]?.currency
      ?? 'PHP';

    // Insert payment record
    await admin.from('payments').insert({
      user_id: user.id,
      gateway: 'paymongo',
      gateway_payment_id: sessionId,
      amount,
      currency,
      plan: plan as Exclude<PlanKey, 'free'>,
      status: 'succeeded',
      metadata: { verified_via: 'client_fallback' },
    });

    // Update profile
    await admin.from('profiles').update({
      plan,
      plan_expires_at: getPlanExpiry(plan as PlanKey).toISOString(),
      payment_gateway: 'paymongo',
    }).eq('id', user.id);

    return NextResponse.json({ plan });

  } else if (gateway === 'stripe') {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

    const stripe = new Stripe(key);
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ plan: 'free', status: session.payment_status });
    }

    const metadata = session.metadata ?? {};
    const plan = metadata.plan as string;
    const metaUserId = metadata.user_id as string;

    if (!plan || !VALID_PLANS.includes(plan as PlanKey)) {
      return NextResponse.json({ error: 'Invalid plan in session' }, { status: 400 });
    }

    if (metaUserId !== user.id) {
      return NextResponse.json({ error: 'Session does not belong to user' }, { status: 403 });
    }

    // Insert payment record
    await admin.from('payments').insert({
      user_id: user.id,
      gateway: 'stripe',
      gateway_payment_id: sessionId,
      gateway_subscription_id: session.subscription as string ?? null,
      amount: session.amount_total ?? 0,
      currency: 'USD',
      plan: plan as Exclude<PlanKey, 'free'>,
      status: 'succeeded',
      metadata: { verified_via: 'client_fallback' },
    });

    // Update profile
    await admin.from('profiles').update({
      plan,
      plan_expires_at: getPlanExpiry(plan as PlanKey).toISOString(),
      payment_gateway: 'stripe',
      gateway_customer_id: session.customer as string ?? null,
      gateway_subscription_id: session.subscription as string ?? null,
    }).eq('id', user.id);

    return NextResponse.json({ plan });
  }

  return NextResponse.json({ error: 'Unknown gateway' }, { status: 400 });
}
