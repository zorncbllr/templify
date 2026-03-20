import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routePayment } from "@/lib/payments/router";
import type { PlanKey } from "@/lib/config/pricing";

const VALID_PLANS: PlanKey[] = [
  "pro_monthly", "pro_quarterly", "pro_annual",
  "biz_monthly", "biz_quarterly", "biz_annual",
];

export async function POST(req: NextRequest) {
  // CSRF: verify Origin header
  const origin = req.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl)
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  if (origin !== appUrl) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { plan } = body as { plan: unknown };

  if (!VALID_PLANS.includes(plan as PlanKey)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Fetch profile — use locale from DB, NOT from request body (prevents PH pricing abuse)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, locale, email")
    .eq("id", user.id)
    .single();

  if (!profile)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (profile.plan !== "free") {
    return NextResponse.json(
      { error: "Already subscribed to a paid plan" },
      { status: 400 },
    );
  }

  const locale = profile.locale as "ph" | "intl";

  try {
    const { checkoutUrl, sessionId, gateway } = await routePayment({
      plan: plan as PlanKey,
      locale,
      userId: user.id,
      userEmail: profile.email ?? user.email ?? "",
    });

    return NextResponse.json({ checkoutUrl, sessionId, gateway });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Payment routing failed" },
      { status: 500 },
    );
  }
}
