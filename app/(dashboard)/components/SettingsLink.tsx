"use client";

import Link from "next/link";
import { IconSettings } from "@/components/Icons";

export default function SettingsLink() {
  return (
    <Link
      href="/settings"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        color: "rgba(240,237,232,0.5)",
        textDecoration: "none",
        padding: "4px 8px",
        borderRadius: 6,
        flexShrink: 0,
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLAnchorElement).style.color =
          "rgba(240,237,232,0.8)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLAnchorElement).style.color =
          "rgba(240,237,232,0.5)")
      }
    >
      <IconSettings size={14} color="currentColor" />
      Settings
    </Link>
  );
}
