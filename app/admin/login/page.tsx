"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthErrorMessage, loginAdmin } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { loginSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");
      return;
    }
    if (!isFirebaseConfigured()) {
      setError(
        "Skonfiguruj Firebase w pliku .env (patrz README.md i .env.example).",
      );
      return;
    }
    setLoading(true);
    try {
      await loginAdmin(parsed.data.email, parsed.data.password);
      router.replace("/admin");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#ff3131]">
            <svg
              width="28"
              height="28"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="1" y="7" width="3.5" height="14" rx="1" fill="white" />
              <rect
                x="17.5"
                y="7"
                width="3.5"
                height="14"
                rx="1"
                fill="white"
              />
              <rect
                x="5.5"
                y="9"
                width="4.5"
                height="10"
                rx="1"
                fill="white"
                opacity="0.75"
              />
              <rect
                x="12"
                y="9"
                width="4.5"
                height="10"
                rx="1"
                fill="white"
                opacity="0.75"
              />
              <rect
                x="1"
                y="4.5"
                width="20"
                height="3.5"
                rx="1"
                fill="white"
              />
            </svg>
          </div>
          <h1 className="font-heading text-xl font-bold text-[#303638]">
            Panel admina
          </h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Ogrodzenia Wielkopolska
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          {!isFirebaseConfigured() && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs text-amber-800">
                Firebase nie jest skonfigurowany. Konfigurator działa w trybie
                demo. Uzupełnij .env według README.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]"
              >
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-[#e5e7eb] focus-visible:ring-[#ff3131]"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6b7280]"
              >
                Hasło
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-[#e5e7eb] focus-visible:ring-[#ff3131]"
              />
            </div>
            {error && (
              <p className="rounded-md bg-[#fff0f0] px-3 py-2 text-sm text-[#dc2626]">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full bg-[#ff3131] hover:bg-[#e02020] text-white font-semibold"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zaloguj się
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-[#9ca3af]">
          <Link
            href="/"
            className="font-medium text-[#6b7280] transition-colors hover:text-[#ff3131]"
          >
            ← Wróć do konfiguratora
          </Link>
        </p>
      </div>
    </div>
  );
}
