"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/actions";
import Link from "next/link";
import {
  IconUser,
  IconCrown,
  IconLogOut,
  IconWarning,
} from "@/components/Icons";
import { getPlanTier, getPlanLimits } from "@/lib/config/pricing";
import type { Profile } from "@/lib/types/database";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [cancelDate, setCancelDate] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .single();
        if (data) {
          setProfile(data as Profile);
        }
      } catch {
        // ignore — stays on the loading state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      setCancelConfirm(false);
      // Reload to reflect the free plan
      window.location.reload();
    } catch {
      setCancelStatus("error");
    }
  }

  const plan = profile?.plan ?? "free";
  const tier = getPlanTier(plan);
  const isPaid = tier !== "free";
  const limits = getPlanLimits(plan);
  const expiryDate = profile?.plan_expires_at
    ? new Date(profile.plan_expires_at).toLocaleDateString()
    : null;

  const planLabel =
    tier === "free"
      ? "Free"
      : tier === "business"
        ? plan
            .replace("biz_", "Business ")
            .replace("monthly", "Monthly")
            .replace("quarterly", "Quarterly")
            .replace("annual", "Annual")
        : plan
            .replace("pro_", "Pro ")
            .replace("monthly", "Monthly")
            .replace("quarterly", "Quarterly")
            .replace("annual", "Annual");

  const storageUsed = profile?.storage_used ?? 0;
  const storageCap = limits.storageBytes;
  const storagePercent = Math.min(
    100,
    Math.round((storageUsed / storageCap) * 100),
  );

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="max-w-160 mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-sm text-app-text/40">
          Manage your account and subscription.
        </p>
      </div>

      {/* Account section */}
      <section className="bg-white/2.5 border border-white/[0.07] rounded-2xl p-6 mb-5">
        <p className="text-[11px] font-bold text-app-text/30 tracking-widest uppercase mb-5">
          Account
        </p>
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              width={44}
              height={44}
              className="rounded-full ring-1 ring-white/10"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div className={`w-11 h-11 rounded-full bg-white/6 flex items-center justify-center text-app-text/40 ${profile?.avatar_url ? "hidden" : ""}`}>
            <IconUser size={20} />
          </div>
          <div>
            <p className="text-[15px] font-semibold m-0">
              {profile?.full_name ?? "Unknown"}
            </p>
            <p className="text-[13px] text-app-text/45 m-0">{profile?.email}</p>
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section className="bg-white/2.5 border border-white/[0.07] rounded-2xl p-6 mb-5">
        <p className="text-[11px] font-bold text-app-text/30 tracking-widest uppercase mb-5">
          Subscription
        </p>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {isPaid && <IconCrown size={16} color="var(--app-accent)" />}
            <span className="text-base font-semibold">{planLabel}</span>
          </div>
          {!isPaid && (
            <Link
              href="/pricing"
              className="text-xs font-semibold text-app-accent no-underline px-3.5 py-1.5 bg-app-accent/10 rounded-lg border border-app-accent/20 transition-all hover:bg-app-accent/15"
            >
              Upgrade
            </Link>
          )}
        </div>

        {isPaid && expiryDate && (
          <p className="text-[13px] text-app-text/45 mb-3">
            Expires on {expiryDate}
          </p>
        )}

        {isPaid && !cancelConfirm && cancelStatus !== "done" && (
          <button
            onClick={() => setCancelConfirm(true)}
            className="text-xs text-red-400/70 bg-transparent border-none cursor-pointer p-0 underline hover:text-red-400 transition-colors"
          >
            Cancel subscription
          </button>
        )}

        {cancelConfirm && (
          <div className="mt-3 p-4 bg-red-500/6 border border-red-500/15 rounded-xl">
            <p className="text-[13px] text-app-text mb-3">
              Your features will remain active until {expiryDate}. After that
              you&apos;ll return to the free plan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelSubscription}
                disabled={cancelStatus === "loading"}
                className="text-xs font-semibold text-white bg-red-500/60 border-none rounded-lg px-4 py-2 cursor-pointer transition-all hover:bg-red-500/70"
              >
                {cancelStatus === "loading"
                  ? "Cancelling..."
                  : "Confirm Cancel"}
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="text-xs text-app-text/50 bg-transparent border border-white/10 rounded-lg px-4 py-2 cursor-pointer transition-all hover:border-white/20 hover:bg-white/3"
              >
                Keep Plan
              </button>
            </div>
            {cancelStatus === "error" && (
              <p className="text-xs text-red-400/80 mt-2 flex items-center gap-1.5">
                <IconWarning size={12} />
                Cancellation failed. Please try again.
              </p>
            )}
          </div>
        )}

        {cancelStatus === "done" && cancelDate && (
          <p className="text-[13px] text-app-text/45 mt-2">
            Subscription cancels on {cancelDate}. Features remain active until
            then.
          </p>
        )}

        {isPaid && (
          <p className="text-[13px] text-app-text/40 mt-3">
            Your plan expires on {expiryDate}.{" "}
            <Link
              href="/pricing"
              className="text-app-accent no-underline hover:underline"
            >
              Renew
            </Link>
          </p>
        )}
      </section>

      {/* Plan limits section */}
      <section className="bg-white/2.5 border border-white/[0.07] rounded-2xl p-6 mb-5">
        <p className="text-[11px] font-bold text-app-text/30 tracking-widest uppercase mb-5">
          Plan Limits
        </p>

        {/* Storage bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-app-text/60">Storage</span>
            <span className="text-[12px] text-app-text/40 tabular-nums">
              {formatBytes(storageUsed)} / {formatBytes(storageCap)}
            </span>
          </div>
          <div className="h-2 bg-white/6 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                storagePercent > 90
                  ? "bg-red-400"
                  : storagePercent > 70
                    ? "bg-yellow-400"
                    : "bg-app-accent"
              }`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>

        {/* Other limits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-app-text/60">
              Rows per export
            </span>
            <span className="text-[13px] font-semibold text-app-text/80 tabular-nums">
              {limits.maxRows.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-app-text/60">Photo columns</span>
            <span className="text-[13px] font-semibold text-app-text/80 tabular-nums">
              {limits.maxPhotoColumns}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-app-text/60">Projects</span>
            <span className="text-[13px] font-semibold text-app-text/80 tabular-nums">
              {limits.maxProjects === Infinity
                ? "Unlimited"
                : limits.maxProjects}
            </span>
          </div>
        </div>

        {!isPaid && (
          <div className="mt-5 pt-4 border-t border-white/6">
            <Link
              href="/pricing"
              className="text-xs font-semibold text-app-accent no-underline hover:underline"
            >
              Upgrade for more storage, rows, and photo columns
            </Link>
          </div>
        )}
      </section>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="flex items-center gap-2 text-[13px] text-app-text/40 bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-app-text/60"
      >
        <IconLogOut size={15} />
        Sign out
      </button>
    </div>
  );
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[rgba(255,255,255,0.03)] ${className ?? ""}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 60%, transparent 100%)",
          animation: "settings-shimmer 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-160 mx-auto px-6 py-12">
      <style>{`
        @keyframes settings-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes settings-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        className="mb-10 flex flex-col gap-2"
        style={{ animation: "settings-fade-in 0.3s ease-out both" }}
      >
        <Shimmer className="w-[120px] h-[26px]" />
        <Shimmer className="w-[240px] h-[14px]" />
      </div>

      {/* Account section */}
      <section
        className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 mb-5"
        style={{ animation: "settings-fade-in 0.4s ease-out 0.1s both" }}
      >
        <Shimmer className="w-[60px] h-[10px] mb-5" />
        <div className="flex items-center gap-4">
          <Shimmer className="w-11 h-11 !rounded-full shrink-0" />
          <div className="flex flex-col gap-2">
            <Shimmer className="w-[140px] h-[15px]" />
            <Shimmer className="w-[200px] h-[13px]" />
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section
        className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 mb-5"
        style={{ animation: "settings-fade-in 0.4s ease-out 0.2s both" }}
      >
        <Shimmer className="w-[90px] h-[10px] mb-5" />
        <div className="flex items-center justify-between mb-3">
          <Shimmer className="w-[100px] h-[18px]" />
          <Shimmer className="w-[75px] h-[30px] !rounded-lg" />
        </div>
      </section>

      {/* Plan limits section */}
      <section
        className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 mb-5"
        style={{ animation: "settings-fade-in 0.4s ease-out 0.3s both" }}
      >
        <Shimmer className="w-[80px] h-[10px] mb-5" />

        {/* Storage bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <Shimmer className="w-[50px] h-[13px]" />
            <Shimmer className="w-[100px] h-[12px]" />
          </div>
          <Shimmer className="w-full h-[8px] !rounded-full" />
        </div>

        {/* Limit rows */}
        <div className="space-y-3">
          {[130, 100, 70].map((w, i) => (
            <div key={i} className="flex items-center justify-between">
              <Shimmer className={`w-[${w}px] h-[13px]`} />
              <Shimmer className="w-[40px] h-[13px]" />
            </div>
          ))}
        </div>
      </section>

      {/* Sign out */}
      <div style={{ animation: "settings-fade-in 0.4s ease-out 0.4s both" }}>
        <Shimmer className="w-[80px] h-[14px]" />
      </div>
    </div>
  );
}
