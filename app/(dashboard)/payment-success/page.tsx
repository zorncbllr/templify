"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconCheckCircle, IconCrown } from "@/components/Icons";

export default function PaymentSuccessPage() {
  const [plan, setPlan] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let attempts = 0;
    let verified = false;

    async function tryVerifyDirectly() {
      // Read checkout info stored before redirect
      const sessionId = sessionStorage.getItem("checkout_session_id");
      const gateway = sessionStorage.getItem("checkout_gateway");
      if (!sessionId || !gateway) return false;

      try {
        const res = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, gateway }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data.plan && data.plan !== "free") {
          sessionStorage.removeItem("checkout_session_id");
          sessionStorage.removeItem("checkout_gateway");
          setPlan(data.plan);
          setPolling(false);
          return true;
        }
      } catch {
        // fall through to polling
      }
      return false;
    }

    async function checkPlan() {
      // On first attempt, try direct verification with the gateway
      if (attempts === 0 && !verified) {
        verified = await tryVerifyDirectly();
        if (verified) return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();

      if (profile?.plan && profile.plan !== "free") {
        setPlan(profile.plan);
        setPolling(false);
        return;
      }

      attempts++;

      // Try direct verification again at attempt 5 (gives gateway time to settle)
      if (attempts === 5 && !verified) {
        verified = await tryVerifyDirectly();
        if (verified) return;
      }

      setTimeout(checkPlan, 2000);
    }

    checkPlan();
  }, []);

  const planLabel = plan
    ? plan
        .replace("biz_", "Business ")
        .replace("pro_", "Pro ")
        .replace("monthly", "Monthly")
        .replace("quarterly", "Quarterly")
        .replace("annual", "Annual")
    : "";
  const tierName = plan?.startsWith("biz_") ? "Business" : "Pro";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "48px 40px",
          textAlign: "center",
        }}
      >
        {polling && !plan && (
          <>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "3px solid rgba(232,255,71,0.3)",
                borderTopColor: "#e8ff47",
                animation: "spin 1s linear infinite",
                margin: "0 auto 24px",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p
              style={{
                color: "rgba(240,237,232,0.6)",
                fontSize: 14,
                margin: 0,
              }}
            >
              Confirming your payment...
            </p>
          </>
        )}

        {plan && (
          <>
            <div style={{ color: "#e8ff47", marginBottom: 20 }}>
              <IconCheckCircle size={48} />
            </div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#f0ede8",
                marginBottom: 8,
              }}
            >
              Welcome to Templify {tierName}!
            </h1>
            <p
              style={{
                color: "rgba(240,237,232,0.6)",
                fontSize: 14,
                marginBottom: 32,
              }}
            >
              {planLabel} plan is now active.
            </p>

            <div
              style={{
                background: "rgba(232,255,71,0.06)",
                border: "1px solid rgba(232,255,71,0.15)",
                borderRadius: 10,
                padding: "20px 24px",
                marginBottom: 32,
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#e8ff47",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                What&apos;s unlocked
              </p>
              {[
                "Unlimited rows per export",
                "Unlimited projects",
                "No export watermark",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    color: "#f0ede8",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#e8ff47", flexShrink: 0 }}>
                    <IconCrown size={14} />
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <a
              href="/dashboard"
              style={{
                display: "inline-block",
                padding: "12px 32px",
                background: "#e8ff47",
                color: "#0a0a0a",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Go to Dashboard
            </a>
          </>
        )}

        {timedOut && !plan && (
          <>
            <div style={{ color: "rgba(240,237,232,0.4)", marginBottom: 20 }}>
              <IconCheckCircle size={48} />
            </div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#f0ede8",
                marginBottom: 8,
              }}
            >
              Payment received
            </h1>
            <p
              style={{
                color: "rgba(240,237,232,0.5)",
                fontSize: 13,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              It may take a moment to activate your plan. Check your dashboard
              shortly.
            </p>
            <a
              href="/dashboard"
              style={{
                display: "inline-block",
                padding: "10px 24px",
                background: "rgba(255,255,255,0.07)",
                color: "#f0ede8",
                borderRadius: 8,
                fontSize: 13,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Go to Dashboard
            </a>
          </>
        )}
      </div>
    </div>
  );
}
