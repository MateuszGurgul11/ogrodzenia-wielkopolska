"use client";

import { useState } from "react";
import { Check, Fence, DoorOpen, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ProductScope,
  useConfiguratorStore,
} from "@/lib/configurator/state";

const OPTIONS: {
  key: keyof ProductScope;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  featureKey?: "bramaEnabled" | "furtkaEnabled";
}[] = [
  {
    key: "fence",
    title: "Płot ogrodzeniowy",
    description:
      "Panele betonowe — wycena za panel (model, kolor, wysokość, słupek, dystans)",
    icon: Fence,
  },
  {
    key: "gate",
    title: "Brama",
    description: "Brama wjazdowa — wybór wariantu i cena netto z katalogu",
    icon: Square,
    featureKey: "bramaEnabled",
  },
  {
    key: "wicket",
    title: "Furtka",
    description: "Furtka panelowa — wybór wariantu i cena jednorazowa netto",
    icon: DoorOpen,
    featureKey: "furtkaEnabled",
  },
];

export function ProductScopeStep() {
  const scope = useConfiguratorStore((s) => s.scope);
  const features = useConfiguratorStore((s) => s.features);
  const setScope = useConfiguratorStore((s) => s.setScope);
  const confirmScope = useConfiguratorStore((s) => s.confirmScope);
  const [error, setError] = useState<string | null>(null);

  const visibleOptions = OPTIONS.filter(
    (opt) => !opt.featureKey || features[opt.featureKey],
  );

  function toggle(key: keyof ProductScope) {
    setError(null);
    setScope({ [key]: !scope[key] });
  }

  function handleConfirm() {
    if (!scope.fence && !scope.gate && !scope.wicket) {
      setError("Zaznacz co najmniej jedną opcję, aby przejść dalej.");
      return;
    }
    confirmScope();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#1a1a1a] px-6 py-12">
      <div className="w-full max-w-lg">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-[#ff3131]">
          Ogrodzenia Wielkopolska
        </p>
        <h1 className="mt-2 text-center font-heading text-2xl font-bold text-white">
          Co chcesz skonfigurować?
        </h1>
        <p className="mt-2 text-center text-sm text-[#888]">
          Zaznacz jedną lub więcej pozycji — możesz wybrać sam płot, samą bramę
          lub kompletny zestaw.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {visibleOptions.map(({ key, title, description, icon: Icon }) => {
            const checked = scope[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-xl border px-4 py-4 text-left transition-all",
                  checked
                    ? "border-[#ff3131] bg-[#2a1515]"
                    : "border-[#333] bg-[#222] hover:border-[#444] hover:bg-[#282828]",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-[#ff3131] bg-[#ff3131]"
                      : "border-[#555] bg-transparent",
                  )}
                >
                  {checked && (
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        checked ? "text-[#ff3131]" : "text-[#666]",
                      )}
                    />
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        checked ? "text-white" : "text-[#ccc]",
                      )}
                    >
                      {title}
                    </p>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#777]">
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-[#ff6b6b]">{error}</p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          className="mt-8 w-full rounded-lg bg-[#ff3131] py-3.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#e02020]"
        >
          Przejdź do konfiguratora
        </button>
      </div>
    </div>
  );
}
