"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const PARTIAL_DECIMAL = /^\d*\.?\d*$/;

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
  suffix?: React.ReactNode;
  /** "dark" — ciemny sidebar konfiguratora; "light" — jasny panel admina. */
  variant?: "dark" | "light";
  id?: string;
  "aria-label"?: string;
};

const VARIANT_CLASSES: Record<NonNullable<Props["variant"]>, string> = {
  dark: "border-[#444] bg-[#1a1a1a] text-white placeholder:text-[#666] focus:border-[#ff3131]",
  light:
    "border-[#d4d4d8] bg-white text-[#303638] placeholder:text-[#9ca3af] focus:border-[#ff3131]",
};

const SUFFIX_CLASSES: Record<NonNullable<Props["variant"]>, string> = {
  dark: "text-[#8a8a8a]",
  light: "text-[#9ca3af]",
};

function valueToDisplay(value: number): string {
  return value > 0 ? String(value) : "";
}

export function DecimalInput({
  value,
  onChange,
  min = 0.1,
  className,
  suffix,
  variant = "dark",
  id,
  "aria-label": ariaLabel,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const displayValue = draft ?? valueToDisplay(value);

  function commitFromRaw(raw: string) {
    if (raw === "" || raw === ".") {
      onChange(0);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      onChange(parsed);
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          if (!PARTIAL_DECIMAL.test(raw)) return;
          setDraft(raw);
          commitFromRaw(raw);
        }}
        onBlur={() => {
          const raw = draft ?? valueToDisplay(value);
          if (raw === "" || raw === "." || Number.isNaN(Number(raw))) {
            onChange(min);
          } else {
            onChange(Math.max(min, Number(raw)));
          }
          setDraft(null);
        }}
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-sm font-semibold outline-none transition-colors",
          VARIANT_CLASSES[variant],
          suffix ? "pr-16" : "pr-3",
          className,
        )}
      />
      {suffix ? (
        <span
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium",
            SUFFIX_CLASSES[variant],
          )}
        >
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
