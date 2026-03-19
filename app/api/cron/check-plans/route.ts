export const runtime = 'nodejs';

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkAndHandleExpiredPlans } from '@/lib/payments/renewal';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return new NextResponse('Server misconfigured', { status: 500 });

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') ?? '';

  // Use timingSafeEqual — NEVER use === for secret comparison
  let authorized = false;
  try {
    authorized = timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret));
  } catch {
    authorized = false;
  }

  if (!authorized) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const result = await checkAndHandleExpiredPlans();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
