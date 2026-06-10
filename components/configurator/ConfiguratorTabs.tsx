"use client";

import { Box, Ruler, Fence, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConfiguratorTab } from "@/lib/configurator/state";

const tabs: {
  id: ConfiguratorTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "model", label: "Model", icon: Box },
  { id: "dimensions", label: "Wymiary", icon: Ruler },
  { id: "gates", label: "Elementy", icon: Fence },
  { id: "review", label: "Podsumowanie", icon: ClipboardCheck },
];

type Props = {
  active: ConfiguratorTab;
  onChange: (tab: ConfiguratorTab) => void;
};

export function ConfiguratorTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 border-b border-[#2a2a2a] px-4 pb-0 pt-3">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1.5 rounded-t-lg px-2 py-2.5 transition-all",
              isActive
                ? "bg-[#2a2a2a] text-[#ff3131]"
                : "text-[#666] hover:bg-[#222] hover:text-[#999]",
            )}
          >
            <Icon className={cn("h-4 w-4", isActive && "text-[#ff3131]")} />
            <span className="text-[9px] font-bold uppercase tracking-[0.08em]">
              {label}
            </span>
            {isActive && (
              <span className="h-0.5 w-full rounded-full bg-[#ff3131]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
