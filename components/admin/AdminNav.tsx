"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/fences", label: "Ogrodzenia" },
  { href: "/admin/settings", label: "Ustawienia" },
];

export function AdminNav() {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  return (
    <nav className="border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          className="font-heading mr-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9ca3af] transition-colors hover:text-[#ff3131]"
        >
          <span className="text-[#ff3131]">←</span>
          Konfigurator
        </Link>
        <div className="mr-2 h-4 w-px bg-[#e5e7eb]" />
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
              pathname === link.href || pathname.startsWith(`${link.href}/`)
                ? "bg-[#ff3131] text-white"
                : "text-[#6b7280] hover:bg-[#f4f5f5] hover:text-[#303638]",
            )}
          >
            {link.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {user?.email && (
            <span className="hidden text-xs text-[#9ca3af] sm:inline">
              {user.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9ca3af] hover:text-[#303638]"
            onClick={() => logout()}
          >
            Wyloguj
          </Button>
        </div>
      </div>
    </nav>
  );
}
