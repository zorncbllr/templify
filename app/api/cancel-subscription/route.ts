export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient_exported } from '@/lib/payments/stripe';

export async function POST(req: NextRequest) {
  // CSRF: verify Origin header
  const origin = req.headers.get('origin');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  if (origin !== appUrl) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, payment_gateway, gateway_subscription_id')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (profile.plan === 'free') return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
  if (profile.payment_gateway !== 'stripe') {
    return NextResponse.json({ error: 'PayMongo subscriptions expire automatically — no cancellation needed' }, { status: 400 });
  }
  if (!profile.gateway_subscription_id) {
    return NextResponse.json({ error: 'No subscription ID found' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient_exported();
    // Use subscription ID from DB — never from request body
    const subscription = await stripe.subscriptions.update(
      profile.gateway_subscription_id,
      { cancel_at_period_end: true },
    );

    return NextResponse.json({
      success: true,
      // cancel_at is set by Stripe when cancel_at_period_end is true
      cancelsAt: (subscription as any).cancel_at ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Cancellation failed' }, { status: 500 });
  }
}
