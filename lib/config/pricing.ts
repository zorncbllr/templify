export const PRICING = {
  pro_monthly: {
    ph: { amount: 19900, currency: 'PHP', display: '₱199', period: 'month' },
    intl: { amount: 27900, currency: 'PHP', display: '₱279', period: 'month' },
  },
  pro_quarterly: {
    ph: { amount: 49900, currency: 'PHP', display: '₱499', period: 'quarter' },
    intl: { amount: 69900, currency: 'PHP', display: '₱699', period: 'quarter' },
  },
  pro_annual: {
    ph: { amount: 169900, currency: 'PHP', display: '₱1,699', period: 'year' },
    intl: { amount: 223900, currency: 'PHP', display: '₱2,239', period: 'year' },
  },
  biz_monthly: {
    ph: { amount: 79900, currency: 'PHP', display: '₱799', period: 'month' },
    intl: { amount: 99900, currency: 'PHP', display: '₱999', period: 'month' },
  },
  biz_quarterly: {
    ph: { amount: 199900, currency: 'PHP', display: '₱1,999', period: 'quarter' },
    intl: { amount: 249900, currency: 'PHP', display: '₱2,499', period: 'quarter' },
  },
  biz_annual: {
    ph: { amount: 699900, currency: 'PHP', display: '₱6,999', period: 'year' },
    intl: { amount: 899900, currency: 'PHP', display: '₱8,999', period: 'year' },
  },
} as const;

export type PlanKey = keyof typeof PRICING;

/** The user-facing tier derived from any plan key */
export type PlanTier = 'free' | 'pro' | 'business';

export function getPlanTier(plan: string): PlanTier {
  if (plan.startsWith('biz_')) return 'business';
  if (plan.startsWith('pro_')) return 'pro';
  return 'free';
}

export function getPlanExpiry(plan: PlanKey): Date {
  const d = new Date();
  switch (plan) {
    case 'pro_monthly':
    case 'biz_monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'pro_quarterly':
    case 'biz_quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'pro_annual':
    case 'biz_annual':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

/** Plan limits used for enforcement */
export const PLAN_LIMITS = {
  free: {
    maxProjects: 3,
    maxRows: 25,
    maxPhotoColumns: 1,
    storageBytes: 200 * 1024 * 1024, // 200MB
  },
  pro: {
    maxProjects: Infinity,
    maxRows: 100,
    maxPhotoColumns: 3,
    storageBytes: 2 * 1024 * 1024 * 1024, // 2GB
  },
  business: {
    maxProjects: Infinity,
    maxRows: 1000,
    maxPhotoColumns: 5,
    storageBytes: 10 * 1024 * 1024 * 1024, // 10GB
  },
} as const;

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[getPlanTier(plan)];
}
