"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Projects" },
  { href: "/settings", label: "Settings" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="ml-8 flex items-center gap-1">
      {links.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`relative rounded-md px-3 py-1.5 text-[13px] font-medium no-underline transition-colors hover:bg-white/[0.04] ${
              isActive
                ? "text-app-text"
                : "text-app-text/50 hover:text-app-text/80"
            }`}
          >
            {label}
            {isActive && (
              <span className="absolute bottom-[-9px] left-1/2 h-[2px] w-14 -translate-x-1/2 rounded-full bg-app-accent" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
