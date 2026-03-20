import { PRICING, type PlanKey } from "@/lib/config/pricing";
import { createCheckoutSession as paymongoCheckout } from "./paymongo";

interface RoutePaymentParams {
  plan: PlanKey;
  locale: "ph" | "intl";
  userId: string;
  userEmail: string;
}

interface RoutePaymentResult {
  gateway: "paymongo";
  checkoutUrl: string;
  sessionId: string;
}

export async function routePayment(
  params: RoutePaymentParams,
): Promise<RoutePaymentResult> {
  const { plan, locale, userId, userEmail } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl)
    throw new Error("Missing NEXT_PUBLIC_APP_URL environment variable");

  const successUrl = `${appUrl}/payment-success`;
  const cancelUrl = `${appUrl}/pricing`;

  const pricing = PRICING[plan][locale];
  if (!pricing) throw new Error(`Plan ${plan} not available in ${locale}`);

  const methodTypes: string[] =
    locale === "ph"
      ? ["qrph", "gcash", "paymaya", "card"]
      : ["card", "paypal"];

  const { checkoutUrl, sessionId } = await paymongoCheckout({
    amount: pricing.amount,
    currency: pricing.currency,
    lineItemName: `Templify ${plan.startsWith("biz_") ? "Business" : "Pro"} (${plan.replace(/^(pro|biz)_/, "")})`,
    paymentMethodTypes: methodTypes,
    successUrl,
    cancelUrl,
    metadata: { user_id: userId, plan },
  });

  return { gateway: "paymongo", checkoutUrl, sessionId };
}
