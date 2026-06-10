"use client";

import { useState } from "react";
import Link from "next/link";
import { seedCatalog } from "@/lib/api/client";
import { isApiConfigured } from "@/lib/api/client";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const sections = [
  { href: "/admin/posts", title: "Słupki", desc: "Warianty słupków ogrodzenia" },
  { href: "/admin/panels", title: "Panele", desc: "Wzory paneli betonowych" },
  {
    href: "/admin/spacers",
    title: "Dystanse",
    desc: "Opcje dystansu i ażurowości",
  },
  {
    href: "/admin/heights",
    title: "Wysokości",
    desc: "Dostępne wysokości płotu (1–2,25 m)",
  },
  { href: "/admin/colors", title: "Kolory", desc: "Kolory malowania" },
];

export default function AdminDashboardPage() {
  const { user, getToken } = useAdminAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  async function handleSeed() {
    if (!confirm("Dodać przykładowe dane do Firestore? (może powielić wpisy)")) {
      return;
    }
    setSeeding(true);
    setSeedMessage(null);
    try {
      const token = await getToken();
      const result = await seedCatalog(token);
      setSeedMessage(result.message);
    } catch (e) {
      setSeedMessage(
        e instanceof Error ? e.message : "Błąd podczas seedowania",
      );
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {user?.email
            ? `Zalogowano jako ${user.email}`
            : "Zarządzaj katalogiem wariantów"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{s.title}</CardTitle>
                <CardDescription>{s.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-primary text-sm font-medium">
                  Zarządzaj →
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {isApiConfigured() && user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dane startowe</CardTitle>
            <CardDescription>
              Jednorazowo wgraj przykładowe słupki, panele, wysokości i kolory do
              Firestore przez API.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={handleSeed} disabled={seeding} variant="outline">
              {seeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Wgraj dane przykładowe
            </Button>
            {seedMessage && (
              <p className="text-muted-foreground text-sm">{seedMessage}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
