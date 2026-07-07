"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useIsMobilePortrait } from "@/lib/hooks/use-media-query";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";

function RotateHintOrbit() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-[#ff3131]"
      viewBox="0 0 128 128"
      fill="none"
      aria-hidden
    >
      <circle
        cx="64"
        cy="64"
        r="52"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="5 9"
        opacity="0.22"
      />
      <path
        className="rotate-hint-arc"
        d="M 64 12 A 52 52 0 1 1 20 88"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        pathLength={1}
      />
    </svg>
  );
}

function RotateHintScene() {
  return (
    <div className="rotate-hint-scene relative flex items-center justify-center rounded-2xl border border-white/5 px-8 py-6">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff3131]/8 blur-2xl"
        aria-hidden
      />

      <div className="rotate-hint-unit relative flex h-[7.5rem] w-[7.5rem] items-center justify-center">
        <RotateHintOrbit />
        <div className="relative z-10 h-[4.5rem] w-[2.25rem] rounded-[0.7rem] border-[3px] border-white/90 bg-[#2a2a2a] shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          <div className="absolute left-1/2 top-1.5 h-1 w-6 -translate-x-1/2 rounded-full bg-white/30" />
          <div className="absolute inset-x-1.5 top-4 bottom-4 overflow-hidden rounded-[0.2rem] bg-gradient-to-b from-[#2a1515] to-[#1a1a1a]" />
          <div className="absolute bottom-2 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

export function RotateDeviceOverlay() {
  const mounted = useMounted();
  const isMobilePortrait = useIsMobilePortrait();

  if (!mounted || !isMobilePortrait) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[#1a1a1a] px-8 text-center lg:hidden",
        "rotate-overlay-enter pt-safe pb-safe",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-device-title"
      aria-describedby="rotate-device-desc"
    >
      <Link
        href="/"
        className="absolute left-4 flex items-center gap-2 rounded-lg border border-[#333] bg-[#222]/90 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ccc] transition-colors hover:border-[#444] hover:bg-[#2a2a2a] hover:text-white"
        style={{ top: "calc(1rem + env(safe-area-inset-top, 0px))" }}
      >
        <ArrowLeft className="h-4 w-4 shrink-0 text-[#ff3131]" aria-hidden />
        Strona główna
      </Link>

      <div className="rotate-hint-content flex flex-col items-center gap-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#ff3131]">
          Ogrodzenia Wielkopolska
        </p>

        <RotateHintScene />

        <div className="max-w-xs space-y-2">
          <h2
            id="rotate-device-title"
            className="font-heading text-xl font-bold text-white"
          >
            Obróć telefon do poziomu
          </h2>
          <p
            id="rotate-device-desc"
            className="text-sm leading-relaxed text-[#888]"
          >
            Konfigurator działa w orientacji poziomej. Przekręć urządzenie, aby
            kontynuować.
          </p>
        </div>

        <Link
          href="/"
          className="text-[11px] font-medium text-[#666] underline-offset-4 transition-colors hover:text-[#ff3131] hover:underline"
        >
          Wróć na stronę główną
        </Link>
      </div>
    </div>
  );
}
