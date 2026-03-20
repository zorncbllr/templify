import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconSparkle, IconCrown } from "@/components/Icons";
import NavLinks from "./components/NavLinks";
import SignOutButton from "./components/SignOutButton";

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
  const initials = displayName
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      {/* Top Nav */}
      <nav className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center border-b border-white/[0.06] bg-app-bg/95 px-6 backdrop-blur-2xl">
        {/* Left: Logo */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 no-underline"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-app-accent text-app-bg">
            <IconSparkle size={12} />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-app-text">
            Templify
          </span>
        </Link>

        {/* Center: Nav links */}
        <NavLinks />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Plan + User */}
        <div className="flex items-center gap-3">
          {/* Plan badge */}
          {isPro ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-app-accent/20 bg-app-accent/[0.08] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-app-accent uppercase">
              <IconCrown
                size={10}
                color="var(--app-accent)"
                className="-translate-y-[1.5px]"
              />
              Pro
            </span>
          ) : (
            <Link
              href="/pricing"
              className="flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-app-text/40 no-underline transition-colors uppercase hover:border-app-accent/20 hover:bg-app-accent/[0.06] hover:text-app-accent"
            >
              Free
            </Link>
          )}

          {/* Divider */}
          <div className="h-5 w-px bg-white/[0.08]" />

          {/* User section */}
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-app-text/50">
              {initials}
            </div>
            <span
              className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium text-app-text/60"
              title={displayName}
            >
              {displayName}
            </span>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Sign out */}
          <SignOutButton />
        </div>
      </nav>

      {/* Content */}
      <div className="pt-14">{children}</div>
    </div>
  );
}
