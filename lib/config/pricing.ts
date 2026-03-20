export const PRICING = {
  pro_monthly: {
    ph: { amount: 29900, currency: 'PHP', display: '₱299', period: 'month' },
    intl: { amount: 39900, currency: 'PHP', display: '₱399', period: 'month' },
  },
  pro_quarterly: {
    ph: { amount: 74900, currency: 'PHP', display: '₱749', period: 'quarter' },
    intl: { amount: 99900, currency: 'PHP', display: '₱999', period: 'quarter' },
  },
  pro_annual: {
    ph: { amount: 249900, currency: 'PHP', display: '₱2,499', period: 'year' },
    intl: { amount: 339900, currency: 'PHP', display: '₱3,399', period: 'year' },
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
    storageBytes: 25 * 1024 * 1024, // 25MB
  },
  pro: {
    maxProjects: Infinity,
    maxRows: 500,
    maxPhotoColumns: 3,
    storageBytes: 200 * 1024 * 1024, // 200MB
  },
  business: {
    maxProjects: Infinity,
    maxRows: 1500,
    maxPhotoColumns: 5,
    storageBytes: 500 * 1024 * 1024, // 500MB
  },
} as const;

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[getPlanTier(plan)];
}
