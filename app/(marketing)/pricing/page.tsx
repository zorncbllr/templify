"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconCheck, IconCrown, IconWarning } from "@/components/Icons";

type PlanKey = "pro_monthly" | "pro_quarterly" | "pro_annual";
type Locale = "ph" | "intl";
type PaymentMethod = "gcash" | "maya" | "card";

const PRICING = {
  pro_monthly: {
    ph: { display: "₱199", period: "month", savings: null },
    intl: { display: "$4.99", period: "month", savings: null },
  },
  pro_quarterly: {
    ph: { display: "₱499", period: "quarter", savings: "Save ₱98" },
    intl: null,
  },
  pro_annual: {
    ph: { display: "₱1,699", period: "year", savings: "Save 3 months" },
    intl: { display: "$39.99", period: "year", savings: "Save $19.89" },
  },
} as const;

const FREE_FEATURES = ["3 projects", "25 rows per export", "Watermark on exports", "All templates"];
const PRO_FEATURES = ["Unlimited projects", "Unlimited rows", "No watermark", "All templates", "Priority support"];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; locales: Locale[] }[] = [
  { id: "gcash", label: "GCash", locales: ["ph"] },
  { id: "maya", label: "Maya", locales: ["ph"] },
  { id: "card", label: "Credit / Debit Card", locales: ["ph", "intl"] },
];

export default function PricingPage() {
  const [locale, setLocale] = useState<Locale>("intl");
  const [billingCycle, setBillingCycle] = useState<PlanKey>("pro_monthly");
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    // Read locale from cookie
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

  function handleLocaleToggle(l: Locale) {
    setLocale(l);
    // Update cookie
    document.cookie = `locale=${l};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    if (l === "intl" && billingCycle === "pro_quarterly") {
      setBillingCycle("pro_monthly");
    }
  }

  async function handleCheckout() {
    if (!selectedMethod) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: billingCycle, paymentMethod: selectedMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Store checkout info so payment-success page can verify directly
      sessionStorage.setItem('checkout_session_id', data.sessionId);
      sessionStorage.setItem('checkout_gateway', data.gateway);
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setCheckoutError(err.message ?? "Something went wrong");
      setCheckoutLoading(false);
    }
  }

  const price = PRICING[billingCycle][locale];
  const isPro = userPlan && userPlan !== "free";

  const availableCycles: { key: PlanKey; label: string }[] = [
    { key: "pro_monthly", label: "Monthly" },
    ...(locale === "ph" ? [{ key: "pro_quarterly" as PlanKey, label: "Quarterly" }] : []),
    { key: "pro_annual", label: "Annual" },
  ];

  const availableMethods = PAYMENT_METHODS.filter((m) => m.locales.includes(locale));

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a10", padding: "60px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1
            style={{ fontSize: 36, fontWeight: 800, color: "#f0ede8", marginBottom: 12, letterSpacing: "-0.5px" }}
          >
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: 16, color: "rgba(240,237,232,0.5)", marginBottom: 24 }}>
            Start free. Upgrade when you need more.
          </p>

          {/* Locale toggle */}
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: 4,
            }}
          >
            {(["ph", "intl"] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => handleLocaleToggle(l)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 5,
                  border: "none",
                  background: locale === l ? "rgba(255,255,255,0.08)" : "transparent",
                  color: locale === l ? "#f0ede8" : "rgba(240,237,232,0.4)",
                  cursor: "pointer",
                }}
              >
                {l === "ph" ? "Philippines" : "International"}
              </button>
            ))}
          </div>
        </div>

        {/* Billing cycle toggle */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
          {availableCycles.map(({ key, label }) => {
            const p = PRICING[key][locale];
            const savings = p?.savings;
            return (
              <button
                key={key}
                onClick={() => setBillingCycle(key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: `1px solid ${billingCycle === key ? "rgba(232,255,71,0.4)" : "rgba(255,255,255,0.08)"}`,
                  background: billingCycle === key ? "rgba(232,255,71,0.08)" : "transparent",
                  color: billingCycle === key ? "#e8ff47" : "rgba(240,237,232,0.5)",
                  cursor: "pointer",
                  minWidth: 100,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                {savings && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "#e8ff47",
                      background: "rgba(232,255,71,0.12)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      marginTop: 3,
                    }}
                  >
                    {savings}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Plan cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
            marginBottom: 48,
          }}
        >
          {/* Free card */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "32px 28px",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(240,237,232,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Free
            </p>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#f0ede8" }}>$0</span>
              <span style={{ fontSize: 14, color: "rgba(240,237,232,0.4)", marginLeft: 4 }}>forever</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
              {FREE_FEATURES.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(240,237,232,0.6)", marginBottom: 10 }}>
                  <span style={{ color: "rgba(240,237,232,0.3)", flexShrink: 0 }}><IconCheck size={14} /></span>
                  {f}
                </li>
              ))}
            </ul>
            {!isLoggedIn ? (
              <a
                href="/sandbox"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "11px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "rgba(240,237,232,0.5)",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Try the demo
              </a>
            ) : !isPro ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "11px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  color: "rgba(240,237,232,0.35)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Current Plan
              </div>
            ) : null}
          </div>

          {/* Pro card */}
          <div
            style={{
              background: "rgba(232,255,71,0.04)",
              border: "1px solid rgba(232,255,71,0.2)",
              borderRadius: 16,
              padding: "32px 28px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#e8ff47",
                color: "#0a0a10",
                fontSize: 10,
                fontWeight: 800,
                padding: "3px 12px",
                borderRadius: 20,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Most Popular
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <IconCrown size={14} color="#e8ff47" />
              <p style={{ fontSize: 13, fontWeight: 700, color: "#e8ff47", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Pro
              </p>
            </div>
            <div style={{ marginBottom: 24 }}>
              {price ? (
                <>
                  <span style={{ fontSize: 36, fontWeight: 800, color: "#f0ede8" }}>{price.display}</span>
                  <span style={{ fontSize: 14, color: "rgba(240,237,232,0.4)", marginLeft: 4 }}>/ {price.period}</span>
                </>
              ) : (
                <span style={{ fontSize: 15, color: "rgba(240,237,232,0.4)" }}>Not available in your region</span>
              )}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
              {PRO_FEATURES.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#f0ede8", marginBottom: 10 }}>
                  <span style={{ color: "#e8ff47", flexShrink: 0 }}><IconCheck size={14} /></span>
                  {f}
                </li>
              ))}
            </ul>
            {!isLoggedIn ? (
              <a
                href="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px",
                  background: "#e8ff47",
                  color: "#0a0a10",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Get started
              </a>
            ) : isPro ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "11px",
                  background: "rgba(232,255,71,0.1)",
                  borderRadius: 8,
                  color: "#e8ff47",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Current Plan
              </div>
            ) : price ? (
              <button
                onClick={() => setShowPaymentModal(true)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#e8ff47",
                  color: "#0a0a10",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Upgrade to Pro
              </button>
            ) : null}
          </div>
        </div>

        {/* Payment modal */}
        {showPaymentModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: 24,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}
          >
            <div
              style={{
                background: "#0a0a10",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "32px",
                width: "100%",
                maxWidth: 400,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0ede8", marginBottom: 8 }}>
                Choose payment method
              </h2>
              <p style={{ fontSize: 13, color: "rgba(240,237,232,0.45)", marginBottom: 24 }}>
                {price?.display} / {price?.period}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {availableMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 9,
                      border: `1px solid ${selectedMethod === method.id ? "rgba(232,255,71,0.4)" : "rgba(255,255,255,0.08)"}`,
                      background: selectedMethod === method.id ? "rgba(232,255,71,0.08)" : "rgba(255,255,255,0.02)",
                      color: selectedMethod === method.id ? "#e8ff47" : "#f0ede8",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
              {checkoutError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    background: "rgba(220,60,60,0.07)",
                    border: "1px solid rgba(220,60,60,0.2)",
                    borderRadius: 7,
                    marginBottom: 16,
                    fontSize: 12,
                    color: "rgba(220,60,60,0.9)",
                  }}
                >
                  <IconWarning size={14} />
                  {checkoutError}
                </div>
              )}
              <button
                onClick={handleCheckout}
                disabled={!selectedMethod || checkoutLoading}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: selectedMethod ? "#e8ff47" : "rgba(255,255,255,0.07)",
                  color: selectedMethod ? "#0a0a10" : "rgba(240,237,232,0.3)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: selectedMethod ? "pointer" : "not-allowed",
                }}
              >
                {checkoutLoading ? "Redirecting..." : "Continue to payment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
