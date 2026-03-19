import { createHmac, timingSafeEqual } from 'crypto';

function getSecretKey(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error('Missing PAYMONGO_SECRET_KEY environment variable');
  return key;
}

function authHeader(): string {
  return 'Basic ' + Buffer.from(getSecretKey() + ':').toString('base64');
}

export interface CreateCheckoutParams {
  amount: number; // in cents
  currency: string;
  lineItemName: string;
  paymentMethodTypes: ('gcash' | 'maya' | 'card')[];
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<string> {
  const res = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [{
            name: params.lineItemName,
            amount: params.amount,
            currency: params.currency,
            quantity: 1,
          }],
          payment_method_types: params.paymentMethodTypes,
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          metadata: params.metadata,
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayMongo checkout error: ${err}`);
  }

  const json = await res.json();
  return json.data.attributes.checkout_url as string;
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
): boolean {
  // Parse signature header: t=<timestamp>,te=<test_sig>,li=<live_sig>
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(',')) {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }

  const timestamp = parseInt(parts['t'] ?? '0', 10);
  const receivedSig = parts['li'] ?? parts['te'] ?? '';

  if (!timestamp || !receivedSig) return false;

  // Check timestamp freshness (5-minute window — prevents replay attacks)
  const tolerance = 5 * 60;
  if (Math.abs(Date.now() / 1000 - timestamp) > tolerance) return false;

  // Compute expected HMAC-SHA256
  const payload = `${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', webhookSecret).update(payload).digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  let receivedBuf: Buffer;
  try {
    receivedBuf = Buffer.from(receivedSig, 'hex');
  } catch {
    return false;
  }

  if (expectedBuf.length !== receivedBuf.length) return false;

  // Use timingSafeEqual — NEVER use === for signature comparison
  return timingSafeEqual(expectedBuf, receivedBuf);
}
