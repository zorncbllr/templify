import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  IconPlus,
  IconEdit,
  IconFolder,
  IconCrown,
  IconWarning,
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
    console.log("createProject data:", data);
    return;
  }
  redirect(`/projects/${data.id}/edit`);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
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

  const isFree = (profile?.plan ?? "free") === "free";
  const projectList = projects ?? [];
  const canCreateProject = !isFree || projectList.length < 3;

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
          gap: 16,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#f0ede8",
            margin: 0,
          }}
        >
          My Projects
        </h1>

        {canCreateProject && (
          <form action={createProject}>
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#e8ff47",
                color: "#0a0a10",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
            >
              <IconPlus size={14} color="#0a0a10" />
              New Project
            </button>
          </form>
        )}
      </div>

      {/* Upgrade CTA for free users at limit */}
      {!canCreateProject && (
        <div
          style={{
            background: "rgba(232,255,71,0.04)",
            border: "1px solid rgba(232,255,71,0.15)",
            borderRadius: 12,
            padding: "18px 24px",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <IconWarning size={18} color="#e8ff47" />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#f0ede8",
                marginBottom: 2,
              }}
            >
              Project limit reached
            </div>
            <div style={{ fontSize: 13, color: "rgba(240,237,232,0.55)" }}>
              Upgrade to Pro for unlimited projects
            </div>
          </div>
          <Link
            href="/pricing"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#e8ff47",
              color: "#0a0a10",
              textDecoration: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <IconCrown size={13} color="#0a0a10" />
            Upgrade to Pro
          </Link>
        </div>
      )}

      {/* Empty state */}
      {projectList.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "80px 24px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
          }}
        >
          <IconFolder size={40} color="rgba(240,237,232,0.2)" />
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(240,237,232,0.5)",
            }}
          >
            No projects yet
          </div>
          <p
            style={{
              fontSize: 13,
              color: "rgba(240,237,232,0.35)",
              margin: 0,
              textAlign: "center",
            }}
          >
            Create your first project to get started
          </p>
          <form action={createProject}>
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#e8ff47",
                color: "#0a0a10",
                border: "none",
                borderRadius: 8,
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <IconPlus size={14} color="#0a0a10" />
              Create Project
            </button>
          </form>
        </div>
      )}

      {/* Project grid */}
      {projectList.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {projectList.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
