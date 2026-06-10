"use client";

import { usePathname } from "next/navigation";
import { AdminAuthProvider } from "@/components/admin/AdminAuthProvider";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  return (
    <AdminAuthProvider>
      {!isLoginPage && <AdminNav />}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </AdminAuthProvider>
  );
}
