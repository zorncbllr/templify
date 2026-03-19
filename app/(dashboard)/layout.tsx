import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconSettings } from "@/components/Icons";
import SignOutButton from "./components/SignOutButton";
import SettingsLink from "./components/SettingsLink";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, plan")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name || user.email || "User";
  const plan = profile?.plan ?? "free";
  const isPro = plan !== "free";

  const truncate = (str: string, max: number) =>
    str.length > max ? str.slice(0, max) + "…" : str;

  return (
    <div
      style={{
        background: "#0a0a10",
        minHeight: "100vh",
        color: "#f0ede8",
      }}
    >
      {/* Top Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: "rgba(10,10,16,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          paddingLeft: 24,
          paddingRight: 24,
          gap: 16,
        }}
      >
        {/* Wordmark */}
        <Link
          href="/dashboard"
          style={{
            fontWeight: 700,
            fontSize: 17,
            color: "#f0ede8",
            letterSpacing: "-0.3px",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          Templify
        </Link>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Plan badge */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: isPro ? "#e8ff47" : "rgba(240,237,232,0.4)",
            background: isPro
              ? "rgba(232,255,71,0.08)"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${isPro ? "rgba(232,255,71,0.2)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 6,
            padding: "2px 8px",
            flexShrink: 0,
          }}
        >
          {isPro ? "Pro" : "Free"}
        </span>

        {/* User name/email */}
        <span
          style={{
            fontSize: 13,
            color: "rgba(240,237,232,0.6)",
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 1,
          }}
          title={displayName}
        >
          {truncate(displayName, 24)}
        </span>

        {/* Settings link */}
        <SettingsLink />

        {/* Sign out */}
        <SignOutButton />
      </nav>

      {/* Content */}
      <div style={{ paddingTop: 56 }}>{children}</div>
    </div>
  );
}
