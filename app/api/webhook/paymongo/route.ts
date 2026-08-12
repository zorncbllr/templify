export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/payments/paymongo';
import { createAdminClient } from '@/lib/supabase/admin';
import { PRICING, getPlanExpiry, type PlanKey } from '@/lib/config/pricing';

const VALID_PLANS: PlanKey[] = [
  'pro_monthly', 'pro_quarterly', 'pro_annual',
  'biz_monthly', 'biz_quarterly', 'biz_annual',
];

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) return new NextResponse('Server misconfigured', { status: 500 });

  // Read raw body BEFORE any parsing — needed for signature verification
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('paymongo-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)) {
    return new NextResponse('Invalid signature', { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  const eventType = event?.data?.attributes?.type;

  if (eventType !== 'checkout_session.payment.paid') {
    return NextResponse.json({ received: true }); // ignore other events
  }

  const session = event.data.attributes.data;
  const metadata = session?.attributes?.metadata ?? {};
  const userId: string = metadata.user_id;
  const plan: string = metadata.plan;
  const paymentId: string = session?.id ?? '';
  // PayMongo checkout sessions store amount in line_items or payment_intent, not at the top level
  const amount: number =
    session?.attributes?.payment_intent?.attributes?.amount
    ?? session?.attributes?.line_items?.[0]?.amount
    ?? 0;
  const currency: string =
    session?.attributes?.payment_intent?.attributes?.currency
    ?? session?.attributes?.line_items?.[0]?.currency
    ?? 'PHP';

  if (!userId || !plan || !paymentId) {
    return new NextResponse('Missing metadata', { status: 400 });
  }

  // Reject test-mode events when using a live secret key
  const secretKey = process.env.PAYMONGO_SECRET_KEY ?? '';
  const isLiveKey = secretKey.startsWith('sk_live_');
  const isLiveEvent = session?.attributes?.livemode !== false;
  if (isLiveKey && !isLiveEvent) {
    return new NextResponse('Livemode mismatch', { status: 400 });
  }

  if (!VALID_PLANS.includes(plan as PlanKey)) {
    return new NextResponse('Invalid plan in metadata', { status: 400 });
  }

  // Amount verification — prevent tampered checkout sessions
  // Accept amount from either locale (user could be ph or intl)
  const planPricing = PRICING[plan as PlanKey];
  const validAmounts: number[] = [planPricing.ph.amount, planPricing.intl.amount];
  if (!validAmounts.includes(amount)) {
    return new NextResponse('Amount mismatch', { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify user exists in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (!profile) return new NextResponse('User not found', { status: 400 });

  // Idempotency check — skip duplicate events
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('gateway_payment_id', paymentId)
    .maybeSingle();

  if (existing) return NextResponse.json({ received: true }); // already processed

  try {
    // Insert payment record
    const { error: insertError } = await supabase.from('payments').insert({
      user_id: userId,
      gateway: 'paymongo',
      gateway_payment_id: paymentId,
      amount,
      currency,
      plan: plan as Exclude<PlanKey, 'free'>,
      status: 'succeeded',
      metadata: { event_type: eventType },
    });
    if (insertError) throw insertError;

    // Update profile
    const { error: updateError } = await supabase.from('profiles').update({
      plan,
      plan_expires_at: getPlanExpiry(plan as PlanKey).toISOString(),
      payment_gateway: 'paymongo',
    }).eq('id', userId);
    if (updateError) throw updateError;
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 500 so PayMongo retries, but the idempotency check keeps retries safe
    return new NextResponse('Processing failed', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
