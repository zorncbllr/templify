"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/actions";
import { IconUser, IconCrown, IconLogOut } from "@/components/Icons";
import type { Profile } from "@/lib/types/database";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<"ph" | "intl">("intl");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [cancelDate, setCancelDate] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setLocale(data.locale ?? "intl");
        }
        setLoading(false);
      });
  }, []);

  async function handleLocaleChange(newLocale: "ph" | "intl") {
    setLocale(newLocale);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ locale: newLocale })
      .eq("id", profile!.id);
    setProfile((p) => p ? { ...p, locale: newLocale } : p);
  }

  async function handleCancelSubscription() {
    setCancelStatus("loading");
    try {
      const res = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCancelStatus("done");
      setCancelDate(
        data.cancelsAt
          ? new Date(data.cancelsAt * 1000).toLocaleDateString()
          : null,
      );
      setCancelConfirm(false);
    } catch {
      setCancelStatus("error");
    }
  }

  const isPro = profile?.plan && profile.plan !== "free";
  const isStripe = profile?.payment_gateway === "stripe";
  const expiryDate = profile?.plan_expires_at
    ? new Date(profile.plan_expires_at).toLocaleDateString()
    : null;
  const planLabel = profile?.plan
    ? profile.plan.replace("pro_", "Pro ").replace("monthly", "Monthly").replace("quarterly", "Quarterly").replace("annual", "Annual")
    : "Free";

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          color: "rgba(240,237,232,0.4)",
          fontSize: 13,
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#f0ede8",
          marginBottom: 32,
        }}
      >
        Settings
      </h1>

      {/* Profile section */}
      <section
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "24px",
          marginBottom: 20,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(240,237,232,0.28)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          Account
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt="avatar"
              width={40}
              height={40}
              style={{ borderRadius: "50%" }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(240,237,232,0.4)",
              }}
            >
              <IconUser size={20} />
            </div>
          )}
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#f0ede8", margin: 0 }}>
              {profile?.full_name ?? "Unknown"}
            </p>
            <p style={{ fontSize: 12, color: "rgba(240,237,232,0.45)", margin: 0 }}>
              {profile?.email}
            </p>
          </div>
        </div>
      </section>

      {/* Plan section */}
      <section
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "24px",
          marginBottom: 20,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(240,237,232,0.28)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          Subscription
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isPro && <IconCrown size={16} color="#e8ff47" />}
            <span style={{ fontSize: 15, fontWeight: 600, color: "#f0ede8" }}>
              {planLabel}
            </span>
          </div>
          {!isPro && (
            <a
              href="/pricing"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#e8ff47",
                textDecoration: "none",
                padding: "6px 14px",
                background: "rgba(232,255,71,0.1)",
                borderRadius: 6,
                border: "1px solid rgba(232,255,71,0.2)",
              }}
            >
              Upgrade to Pro
            </a>
          )}
        </div>

        {isPro && expiryDate && (
          <p style={{ fontSize: 12, color: "rgba(240,237,232,0.45)", margin: "0 0 12px" }}>
            {isStripe ? "Renews" : "Expires"} on {expiryDate}
          </p>
        )}

        {isPro && isStripe && cancelStatus === "idle" && !cancelConfirm && (
          <button
            onClick={() => setCancelConfirm(true)}
            style={{
              fontSize: 12,
              color: "rgba(220,60,60,0.7)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Cancel subscription
          </button>
        )}

        {cancelConfirm && (
          <div
            style={{
              marginTop: 12,
              padding: "16px",
              background: "rgba(220,60,60,0.07)",
              border: "1px solid rgba(220,60,60,0.2)",
              borderRadius: 8,
            }}
          >
            <p style={{ fontSize: 13, color: "#f0ede8", marginBottom: 12 }}>
              Your Pro features will remain active until {expiryDate}. After that
              you&apos;ll return to the free plan.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelStatus === "loading"}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  background: "rgba(220,60,60,0.6)",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 16px",
                  cursor: "pointer",
                }}
              >
                {cancelStatus === "loading" ? "Cancelling..." : "Confirm Cancel"}
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                style={{
                  fontSize: 12,
                  color: "rgba(240,237,232,0.5)",
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  padding: "7px 16px",
                  cursor: "pointer",
                }}
              >
                Keep Plan
              </button>
            </div>
            {cancelStatus === "error" && (
              <p style={{ fontSize: 12, color: "rgba(220,60,60,0.8)", marginTop: 8 }}>
                Cancellation failed. Please try again.
              </p>
            )}
          </div>
        )}

        {cancelStatus === "done" && cancelDate && (
          <p style={{ fontSize: 12, color: "rgba(240,237,232,0.45)", marginTop: 8 }}>
            Subscription cancels on {cancelDate}. Pro features remain active until then.
          </p>
        )}

        {isPro && !isStripe && (
          <p style={{ fontSize: 12, color: "rgba(240,237,232,0.4)", marginTop: 4 }}>
            Your plan expires on {expiryDate}.{" "}
            <a href="/pricing" style={{ color: "#e8ff47", textDecoration: "none" }}>
              Renew
            </a>
          </p>
        )}
      </section>

      {/* Locale section */}
      <section
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "24px",
          marginBottom: 20,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(240,237,232,0.28)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          Region
        </p>
        <p style={{ fontSize: 12, color: "rgba(240,237,232,0.45)", marginBottom: 14 }}>
          Controls pricing currency and available payment methods.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {(["ph", "intl"] as const).map((l) => (
            <button
              key={l}
              onClick={() => handleLocaleChange(l)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 16px",
                borderRadius: 7,
                border: `1px solid ${locale === l ? "rgba(232,255,71,0.4)" : "rgba(255,255,255,0.1)"}`,
                background: locale === l ? "rgba(232,255,71,0.1)" : "transparent",
                color: locale === l ? "#e8ff47" : "rgba(240,237,232,0.5)",
                cursor: "pointer",
              }}
            >
              {l === "ph" ? "Philippines" : "International"}
            </button>
          ))}
        </div>
      </section>

      {/* Sign out */}
      <button
        onClick={signOut}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 13,
          color: "rgba(240,237,232,0.4)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <IconLogOut size={15} />
        Sign out
      </button>
    </div>
  );
}
