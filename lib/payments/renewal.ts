import { createAdminClient } from '@/lib/supabase/admin';

export async function checkAndHandleExpiredPlans(): Promise<{ expired: number }> {
  const supabase = createAdminClient();

  // Find PayMongo users whose plan has expired
  const { data: expired, error } = await supabase
    .from('profiles')
    .select('id')
    .neq('plan', 'free')
    .eq('payment_gateway', 'paymongo')
    .lt('plan_expires_at', new Date().toISOString());

  if (error) throw new Error(`Failed to query expired plans: ${error.message}`);
  if (!expired || expired.length === 0) return { expired: 0 };

  const ids = expired.map((p) => p.id);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      plan: 'free',
      plan_expires_at: null,
      payment_gateway: null,
      gateway_customer_id: null,
      gateway_subscription_id: null,
    })
    .in('id', ids);

  if (updateError) throw new Error(`Failed to downgrade expired plans: ${updateError.message}`);

  return { expired: ids.length };
}
