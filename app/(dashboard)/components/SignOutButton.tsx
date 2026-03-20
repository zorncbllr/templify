"use client";

import { signOut } from "@/lib/auth/actions";
import { IconLogOut } from "@/components/Icons";

export default function SignOutButton() {
  return (
    <button
      onClick={signOut}
      title="Sign out"
      className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-transparent px-2 py-1.5 text-[12px] font-medium text-app-text/40 transition-colors hover:text-app-text/70"
    >
      <IconLogOut size={14} color="currentColor" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
