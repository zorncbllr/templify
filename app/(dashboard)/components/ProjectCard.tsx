"use client";

import Link from "next/link";
import { IconEdit, IconClock } from "@/components/Icons";
import DeleteProjectButton from "./DeleteProjectButton";

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

export default function ProjectCard({ project }: { project: any }) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]">
      {/* Card header / thumbnail area */}
      <Link
        href={`/projects/${project.id}/edit`}
        className="flex h-32 items-center justify-center rounded-t-xl border-b border-white/[0.04] bg-white/[0.01] no-underline"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] transition-colors group-hover:bg-app-accent/[0.08]">
          <IconEdit
            size={20}
            color="rgba(240,237,232,0.2)"
            className="transition-colors group-hover:!text-app-accent"
          />
        </div>
      </Link>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/projects/${project.id}/edit`}
            className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold leading-snug text-app-text no-underline transition-colors hover:text-app-accent"
            title={project.name}
          >
            {project.name || "Untitled Project"}
          </Link>
          <DeleteProjectButton projectId={project.id} />
        </div>

        {/* Meta info */}
        <div className="mt-auto flex items-center gap-3 text-[11px] text-app-text/35">
          {project.updated_at && (
            <span className="flex items-center gap-1 tabular-nums">
              <IconClock size={11} color="currentColor" />
              {formatRelative(project.updated_at)}
            </span>
          )}
          {typeof project.row_count === "number" && (
            <span className="tabular-nums">
              {project.row_count} row{project.row_count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
