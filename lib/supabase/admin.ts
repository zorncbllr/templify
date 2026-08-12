import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

// Service role client — bypasses RLS.
// Use ONLY in API routes (webhook handlers, cron jobs).
// NEVER import from client components or server components.
export function createAdminClient() {
  return createSupabaseClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}
