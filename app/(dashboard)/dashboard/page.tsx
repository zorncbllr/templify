import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  IconPlus,
  IconFolder,
  IconCrown,
  IconWarning,
  IconLayers,
  IconClock,
} from "@/components/Icons";
import ProjectCard from "../components/ProjectCard";

async function createProject() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name: "Untitled Project" })
    .select("id")
    .single();
  if (error) {
    console.log("createProject error:", error);
    return;
  }
  redirect(`/projects/${data.id}/edit`);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const plan = profile?.plan ?? "free";
  const isFree = plan === "free";
  const displayName = profile?.full_name || user.email || "User";
  const firstName = displayName.split(" ")[0].split("@")[0];
  const projectList = projects ?? [];
  const canCreateProject = !isFree || projectList.length < 3;
  const projectLimit = isFree ? 3 : null;

  const lastUpdated =
    projectList.length > 0 ? projectList[0].updated_at : null;

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      {/* Welcome section */}
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-app-text/40">
            {projectList.length === 0
              ? "Create your first project to get started."
              : `You have ${projectList.length} project${projectList.length !== 1 ? "s" : ""}.`}
          </p>
        </div>
        {canCreateProject && (
          <form action={createProject}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full bg-app-accent px-5 py-2.5 text-[13px] font-bold text-app-bg transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(232,255,71,0.25)]"
            >
              <IconPlus size={14} color="var(--app-bg)" />
              New Project
            </button>
          </form>
        )}
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total projects */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-5 transition-all hover:-translate-y-0.5 hover:border-white/[0.12]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent/[0.08] border border-app-accent/[0.15]">
            <IconLayers size={17} color="var(--app-accent)" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest text-app-text/30 uppercase">
              Projects
            </div>
            <div className="text-xl font-bold tabular-nums">
              {projectList.length}
              {projectLimit !== null && (
                <span className="ml-1 text-xs font-normal text-app-text/25">
                  / {projectLimit}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-5 transition-all hover:-translate-y-0.5 hover:border-white/[0.12]">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isFree
                ? "bg-white/[0.04] border-white/[0.08]"
                : "bg-app-accent/[0.08] border-app-accent/[0.15]"
            }`}
          >
            <IconCrown
              size={17}
              color={
                isFree ? "rgba(240,237,232,0.3)" : "var(--app-accent)"
              }
            />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest text-app-text/30 uppercase">
              Plan
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xl font-bold ${isFree ? "text-app-text/50" : "text-app-accent"}`}
              >
                {isFree ? "FREE" : plan.startsWith("biz_") ? "BIZ" : "PRO"}
              </span>
              {isFree && (
                <Link
                  href="/pricing"
                  className="rounded-full bg-app-accent/10 border border-app-accent/20 px-2.5 py-0.5 text-[10px] font-semibold text-app-accent no-underline transition-all hover:bg-app-accent/15"
                >
                  Upgrade
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Last activity */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-5 transition-all hover:-translate-y-0.5 hover:border-white/[0.12]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <IconClock size={17} color="rgba(240,237,232,0.3)" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest text-app-text/30 uppercase">
              Last Active
            </div>
            <div className="text-xl font-bold text-app-text/60 tabular-nums">
              {lastUpdated ? formatRelative(lastUpdated) : "--"}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade CTA for free users at limit */}
      {!canCreateProject && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-app-accent/15 bg-app-accent/[0.04] px-6 py-5">
          <IconWarning size={18} color="var(--app-accent)" />
          <div className="flex-1">
            <div className="mb-0.5 text-sm font-semibold">
              Project limit reached
            </div>
            <div className="text-[13px] text-app-text/50">
              Upgrade to Pro for unlimited projects, exports, and more.
            </div>
          </div>
          <Link
            href="/pricing"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-app-accent px-5 py-2 text-[13px] font-bold text-app-bg no-underline transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(232,255,71,0.25)]"
          >
            <IconCrown size={13} color="var(--app-bg)" />
            Upgrade to Pro
          </Link>
        </div>
      )}

      {/* Section label */}
      {projectList.length > 0 && (
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[11px] font-bold tracking-widest text-app-text/30 uppercase">
            All Projects
          </h2>
        </div>
      )}

      {/* Empty state */}
      {projectList.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
            <IconFolder size={28} color="rgba(240,237,232,0.2)" />
          </div>
          <div className="text-center">
            <div className="mb-1.5 text-base font-semibold text-app-text/50">
              No projects yet
            </div>
            <p className="m-0 text-[13px] text-app-text/30">
              Create a project to start designing templates with your data.
            </p>
          </div>
          <form action={createProject}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full bg-app-accent px-6 py-2.5 text-[13px] font-bold text-app-bg transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(232,255,71,0.25)]"
            >
              <IconPlus size={14} color="var(--app-bg)" />
              Create Project
            </button>
          </form>
        </div>
      )}

      {/* Project grid */}
      {projectList.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectList.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
