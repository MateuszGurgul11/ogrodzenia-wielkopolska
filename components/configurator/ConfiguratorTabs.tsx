"use client";

import { useConfiguratorStore, getVisibleConfiguratorTabs } from "@/lib/configurator/state";
import { Box, Ruler, Fence, Calculator, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConfiguratorTab } from "@/lib/configurator/state";

const TAB_META: Record<
  ConfiguratorTab,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  model: { label: "Model", icon: Box },
  dimensions: { label: "Wymiary", icon: Ruler },
  gates: { label: "Elementy", icon: Fence },
  quote: { label: "Wycena", icon: Calculator },
  review: { label: "Podsumowanie", icon: ClipboardCheck },
};

type Props = {
  active: ConfiguratorTab;
  onChange: (tab: ConfiguratorTab) => void;
};

export function ConfiguratorTabs({ active, onChange }: Props) {
  const scope = useConfiguratorStore((s) => s.scope);
  const tabs = getVisibleConfiguratorTabs(scope);

  return (
    <div className="scrollbar-dark flex flex-nowrap gap-0.5 overflow-x-auto border-b border-[#2a2a2a] px-2 pb-0 pt-3 max-lg:landscape:pt-1.5 sm:gap-1 sm:px-4">
      {tabs.map((id) => {
        const { label, icon: Icon } = TAB_META[id];
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex shrink-0 flex-col items-center gap-1.5 rounded-t-lg px-2.5 py-2.5 transition-all max-lg:min-h-[44px] max-lg:flex-row max-lg:gap-1.5 max-lg:landscape:min-h-0 max-lg:landscape:flex-col max-lg:landscape:py-1.5 max-lg:px-3 sm:px-3",
              isActive
                ? "bg-[#2a2a2a] text-[#ff3131]"
                : "text-[#666] hover:bg-[#222] hover:text-[#999]",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-[#ff3131]")} />
            <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.08em] max-lg:landscape:text-[8px]">
              {label}
            </span>
            {isActive && (
              <span className="hidden h-0.5 w-full rounded-full bg-[#ff3131] max-lg:landscape:block lg:block" />
            )}
          </button>
        );
      })}
    </div>
  );
}
