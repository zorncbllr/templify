import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Missing or empty code — redirect without leaking internal state
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url),
    );
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url),
    );
  }

  // Always redirect to a hardcoded path — never use a user-supplied redirectTo
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
