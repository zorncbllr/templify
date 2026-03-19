"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconTrash } from "@/components/Icons";

interface DeleteProjectButtonProps {
  projectId: string;
}

export default function DeleteProjectButton({
  projectId,
}: DeleteProjectButtonProps) {
  const [hovered, setHovered] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this project? This cannot be undone.",
    );
    if (!confirmed) return;

    const supabase = createClient();
    await supabase.from("projects").delete().eq("id", projectId);
    window.location.reload();
  }

  return (
    <button
      onClick={handleDelete}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Delete project"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: hovered ? "rgba(220,60,60,0.8)" : "rgba(240,237,232,0.3)",
        padding: 6,
        borderRadius: 6,
        transition: "color 0.15s",
        flexShrink: 0,
      }}
    >
      <IconTrash size={14} color="currentColor" />
    </button>
  );
}
