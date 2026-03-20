"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IconCheck, IconCrown, IconWarning } from "@/components/Icons";

type BillingCycle = "monthly" | "quarterly" | "annual";
type Locale = "ph" | "intl";

const BILLING_CYCLES: { key: BillingCycle; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "annual", label: "Annual" },
];

const TIERS = {
  free: {
    name: "Free",
    description: "For trying things out",
    features: [
      "3 projects",
      "25 rows per export",
      "1 photo column",
      "200MB storage",
      "Watermark on exports",
    ],
  },
  pro: {
    name: "Pro",
    description: "For individuals and small teams",
    features: [
      "Unlimited projects",
      "100 rows per export",
      "3 photo columns",
      "2GB storage",
      "No watermark",
    ],
    pricing: {
      monthly: { ph: "₱199", intl: "₱279", savings: null },
      quarterly: {
        ph: "₱499",
        intl: "₱699",
        savings: { ph: "Save ₱98", intl: "Save ₱138" },
      },
      annual: {
        ph: "₱1,699",
        intl: "₱2,239",
        savings: { ph: "Save 3 months", intl: "Save 3 months" },
      },
    },
    planPrefix: "pro",
  },
  business: {
    name: "Business",
    description: "For organizations and power users",
    features: [
      "Unlimited projects",
      "1,000 rows per export",
      "5 photo columns",
      "10GB storage",
      "No watermark",
      "Priority support",
    ],
    pricing: {
      monthly: { ph: "₱799", intl: "₱999", savings: null },
      quarterly: {
        ph: "₱1,999",
        intl: "₱2,499",
        savings: { ph: "Save ₱398", intl: "Save ₱498" },
      },
      annual: {
        ph: "₱6,999",
        intl: "₱8,999",
        savings: { ph: "Save 3 months", intl: "Save 3 months" },
      },
    },
    planPrefix: "biz",
  },
} as const;

const PERIODS: Record<BillingCycle, string> = {
  monthly: "month",
  quarterly: "quarter",
  annual: "year",
};

export default function PricingPage() {
  const [locale, setLocale] = useState<Locale>("intl");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const cookieLocale = document.cookie
      .split(";")
      .find((c) => c.trim().startsWith("locale="))
      ?.split("=")[1] as Locale | undefined;
    if (cookieLocale) setLocale(cookieLocale);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setIsLoggedIn(true);
      supabase
        .from("profiles")
        .select("plan, locale")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUserPlan(data.plan);
            setLocale(data.locale as Locale);
          }
        });
    });
  }, []);

  async function handleCheckout(planKey: string) {
    setCheckoutLoading(planKey);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem("checkout_session_id", data.sessionId);
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setCheckoutError(err.message ?? "Something went wrong");
      setCheckoutLoading(null);
    }
  }

  const userTier = !userPlan || userPlan === "free" ? "free" : userPlan.startsWith("biz_") ? "business" : "pro";

  return (
    <div className="min-h-screen bg-app-bg text-app-text overflow-x-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-125 h-125 rounded-full bg-app-accent/6 blur-[100px] top-[5%] left-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-20 pb-24">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-app-accent/10 text-app-accent border border-app-accent/20 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase mb-5">
            Pricing
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-base text-app-text/50">
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex justify-center gap-1.5 mb-12 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1.5 w-fit mx-auto">
          {BILLING_CYCLES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setBillingCycle(key)}
              className={`text-[13px] font-semibold px-5 py-2 rounded-lg border-none cursor-pointer transition-all ${
                billingCycle === key
                  ? "bg-app-accent text-app-bg"
                  : "bg-transparent text-app-text/50 hover:text-app-text/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {checkoutError && (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/[0.07] border border-red-500/20 rounded-xl mb-8 max-w-md mx-auto">
            <IconWarning size={14} />
            <span className="text-xs text-red-400">{checkoutError}</span>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Free card */}
          <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-8 flex flex-col transition-all hover:-translate-y-1 hover:border-white/12">
            <p className="text-[11px] font-bold text-app-text/35 tracking-widest uppercase mb-2">
              {TIERS.free.name}
            </p>
            <p className="text-[13px] text-app-text/40 mb-6">
              {TIERS.free.description}
            </p>
            <div className="mb-1">
              <span className="text-4xl font-extrabold">₱0</span>
            </div>
            <p className="text-sm text-app-text/35 mb-8">forever</p>
            <ul className="list-none p-0 m-0 mb-auto space-y-3">
              {TIERS.free.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-[13px] text-app-text/55"
                >
                  <span className="text-app-text/25 shrink-0">
                    <IconCheck size={13} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {!isLoggedIn ? (
                <Link
                  href="/sandbox"
                  className="block text-center py-2.5 border border-white/10 rounded-lg text-app-text/50 no-underline text-[13px] font-semibold transition-all hover:border-white/20 hover:bg-white/3"
                >
                  Try the demo
                </Link>
              ) : userTier === "free" ? (
                <div className="text-center py-2.5 bg-white/4 rounded-lg text-app-text/35 text-[13px] font-semibold">
                  Current Plan
                </div>
              ) : null}
            </div>
          </div>

          {/* Pro card */}
          {(() => {
            const tier = TIERS.pro;
            const pricing = tier.pricing[billingCycle];
            const display = locale === "ph" ? pricing.ph : pricing.intl;
            const savings = pricing.savings
              ? locale === "ph"
                ? pricing.savings.ph
                : pricing.savings.intl
              : null;
            const planKey = `${tier.planPrefix}_${billingCycle}`;
            const isLoading = checkoutLoading === planKey;

            return (
              <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-8 flex flex-col transition-all hover:-translate-y-1 hover:border-white/12">
                <div className="flex items-center gap-1.5 mb-2">
                  <IconCrown size={13} color="rgba(240,237,232,0.4)" />
                  <p className="text-[11px] font-bold text-app-text/40 tracking-widest uppercase m-0">
                    {tier.name}
                  </p>
                </div>
                <p className="text-[13px] text-app-text/40 mb-6">
                  {tier.description}
                </p>
                <div className="mb-1">
                  <span className="text-4xl font-extrabold">{display}</span>
                </div>
                <div className="flex items-center gap-2 mb-8">
                  <p className="text-sm text-app-text/35">
                    / {PERIODS[billingCycle]}
                  </p>
                  {savings && (
                    <span className="text-[10px] font-semibold text-app-accent bg-app-accent/12 px-2 py-0.5 rounded">
                      {savings}
                    </span>
                  )}
                </div>
                <ul className="list-none p-0 m-0 mb-auto space-y-3">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-[13px] text-app-text"
                    >
                      <span className="text-app-text/40 shrink-0">
                        <IconCheck size={13} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {!isLoggedIn ? (
                    <Link
                      href="/login"
                      className="block text-center py-2.5 rounded-lg no-underline text-[13px] font-bold bg-white/6 text-app-text hover:bg-white/10 transition-all"
                    >
                      Get started
                    </Link>
                  ) : userTier === "pro" ? (
                    <div className="text-center py-2.5 bg-app-accent/10 rounded-lg text-app-accent text-[13px] font-semibold">
                      Current Plan
                    </div>
                  ) : userTier === "free" ? (
                    <button
                      onClick={() => handleCheckout(planKey)}
                      disabled={checkoutLoading !== null}
                      className="w-full py-2.5 border-none rounded-lg text-[13px] font-bold bg-white/6 text-app-text hover:bg-white/10 transition-all"
                      style={{
                        cursor:
                          checkoutLoading !== null ? "not-allowed" : "pointer",
                        opacity:
                          checkoutLoading !== null && !isLoading ? 0.5 : 1,
                      }}
                    >
                      {isLoading ? "Redirecting..." : "Upgrade to Pro"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })()}

          {/* Business card */}
          {(() => {
            const tier = TIERS.business;
            const pricing = tier.pricing[billingCycle];
            const display = locale === "ph" ? pricing.ph : pricing.intl;
            const savings = pricing.savings
              ? locale === "ph"
                ? pricing.savings.ph
                : pricing.savings.intl
              : null;
            const planKey = `${tier.planPrefix}_${billingCycle}`;
            const isLoading = checkoutLoading === planKey;

            return (
              <div className="relative bg-app-accent/4 border border-app-accent/20 rounded-2xl p-8 flex flex-col transition-all hover:-translate-y-1 hover:border-app-accent/35">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-app-accent text-app-bg text-[10px] font-extrabold px-3 py-0.5 rounded-full tracking-[0.08em] uppercase whitespace-nowrap">
                  Best Value
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <IconCrown size={13} color="var(--app-accent)" />
                  <p className="text-[11px] font-bold text-app-accent tracking-widest uppercase m-0">
                    {tier.name}
                  </p>
                </div>
                <p className="text-[13px] text-app-text/40 mb-6">
                  {tier.description}
                </p>
                <div className="mb-1">
                  <span className="text-4xl font-extrabold">{display}</span>
                </div>
                <div className="flex items-center gap-2 mb-8">
                  <p className="text-sm text-app-text/35">
                    / {PERIODS[billingCycle]}
                  </p>
                  {savings && (
                    <span className="text-[10px] font-semibold text-app-accent bg-app-accent/12 px-2 py-0.5 rounded">
                      {savings}
                    </span>
                  )}
                </div>
                <ul className="list-none p-0 m-0 mb-auto space-y-3">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-[13px] text-app-text"
                    >
                      <span className="text-app-accent shrink-0">
                        <IconCheck size={13} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {!isLoggedIn ? (
                    <Link
                      href="/login"
                      className="block text-center py-2.5 rounded-lg no-underline text-[13px] font-bold bg-app-accent text-app-bg hover:shadow-[0_8px_24px_rgba(232,255,71,0.25)] transition-all"
                    >
                      Get started
                    </Link>
                  ) : userTier === "business" ? (
                    <div className="text-center py-2.5 bg-app-accent/10 rounded-lg text-app-accent text-[13px] font-semibold">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckout(planKey)}
                      disabled={checkoutLoading !== null}
                      className="w-full py-2.5 border-none rounded-lg text-[13px] font-bold bg-app-accent text-app-bg hover:shadow-[0_8px_24px_rgba(232,255,71,0.25)] transition-all"
                      style={{
                        cursor:
                          checkoutLoading !== null ? "not-allowed" : "pointer",
                        opacity:
                          checkoutLoading !== null && !isLoading ? 0.5 : 1,
                      }}
                    >
                      {isLoading
                        ? "Redirecting..."
                        : "Upgrade to Business"}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
