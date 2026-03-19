import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS.
// Use ONLY in API routes (webhook handlers, cron jobs).
// NEVER import from client components or server components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
