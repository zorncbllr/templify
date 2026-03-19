"use client";

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle() {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/";
}
