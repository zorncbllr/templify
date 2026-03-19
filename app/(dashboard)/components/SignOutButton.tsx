"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth/actions";
import { IconLogOut } from "@/components/Icons";

export default function SignOutButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={signOut}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: hovered ? "rgba(240,237,232,0.8)" : "rgba(240,237,232,0.5)",
        fontSize: 13,
        padding: "4px 8px",
        borderRadius: 6,
        transition: "color 0.15s",
      }}
    >
      <IconLogOut size={14} color="currentColor" />
      Sign out
    </button>
  );
}
