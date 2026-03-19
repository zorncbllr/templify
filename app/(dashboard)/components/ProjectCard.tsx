"use client";

import Link from "next/link";
import { IconEdit } from "@/components/Icons";
import DeleteProjectButton from "./DeleteProjectButton";

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

export default function ProjectCard({ project }: { project: any }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "background 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background =
          "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background =
          "rgba(255,255,255,0.03)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Link
          href={`/projects/${project.id}/edit`}
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#f0ede8",
            textDecoration: "none",
            flex: 1,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={project.name}
        >
          {project.name || "Untitled Project"}
        </Link>
        <DeleteProjectButton projectId={project.id} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {project.updated_at && (
          <span
            style={{
              fontSize: 11,
              color: "rgba(240,237,232,0.4)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Last updated: {formatDate(project.updated_at)}
          </span>
        )}
        {typeof project.row_count === "number" && (
          <span
            style={{
              fontSize: 11,
              color: "rgba(240,237,232,0.4)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Rows: {project.row_count}
          </span>
        )}
      </div>

      <Link
        href={`/projects/${project.id}/edit`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "#e8ff47",
          textDecoration: "none",
          fontWeight: 500,
          marginTop: "auto",
          width: "fit-content",
        }}
      >
        <IconEdit size={12} color="#e8ff47" />
        Open Editor
      </Link>
    </div>
  );
}
