export const PRICING = {
  pro_monthly: {
    ph: { amount: 19900, currency: 'PHP', display: '₱199', period: 'month' },
    intl: { amount: 499, currency: 'USD', display: '$4.99', period: 'month' },
  },
  pro_quarterly: {
    ph: { amount: 49900, currency: 'PHP', display: '₱499', period: 'quarter' },
    intl: null, // quarterly not offered internationally
  },
  pro_annual: {
    ph: { amount: 169900, currency: 'PHP', display: '₱1,699', period: 'year' },
    intl: { amount: 3999, currency: 'USD', display: '$39.99', period: 'year' },
  },
} as const;

export type PlanKey = keyof typeof PRICING;

export function getPlanExpiry(plan: PlanKey): Date {
  const d = new Date();
  switch (plan) {
    case 'pro_monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'pro_quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'pro_annual':    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}
