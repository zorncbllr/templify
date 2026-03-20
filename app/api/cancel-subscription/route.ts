export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, payment_gateway, gateway_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (profile.plan === "free")
    return NextResponse.json(
      { error: "No active subscription" },
      { status: 400 },
    );

  // PayMongo plans are one-time payments that expire — "cancelling" means
  // downgrading to free immediately and clearing the expiry.
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      plan: "free",
      plan_expires_at: null,
      payment_gateway: null,
    })
    .eq("id", user.id);

  if (error)
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );

  return NextResponse.json({ cancelled: true });
}
