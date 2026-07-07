"use client";

import { PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfiguratorStore } from "@/lib/configurator/state";

type Props = {
  children?: React.ReactNode;
  className?: string;
  /** Wyróżniony przycisk menu na mobile */
  accent?: boolean;
};

export function PreviewControlsBar({ children, className, accent }: Props) {
  const sidebarOpen = useConfiguratorStore((s) => s.sidebarOpen);
  const toggleSidebarOpen = useConfiguratorStore((s) => s.toggleSidebarOpen);

  return (
    <div
      className={cn(
        "absolute right-3 top-3 z-20 flex gap-2 sm:right-4 sm:top-4",
        className,
      )}
    >
      <button
        type="button"
        aria-label={sidebarOpen ? "Ukryj panel opcji" : "Pokaż panel opcji"}
        title={sidebarOpen ? "Ukryj panel opcji" : "Pokaż panel opcji"}
        onClick={toggleSidebarOpen}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white/92 text-[#6b7280] shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-[#303638] lg:h-9 lg:w-9",
          accent &&
            "max-lg:border-transparent max-lg:bg-[#ff3131] max-lg:text-white max-lg:shadow-md max-lg:hover:bg-[#e02020] max-lg:hover:text-white",
        )}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeft className="h-4 w-4" />
        )}
      </button>
      {children}
    </div>
  );
}
