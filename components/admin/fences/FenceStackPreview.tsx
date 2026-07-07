"use client";

import type { FenceBlock } from "@/lib/types";
import { resolveStackUnits } from "@/lib/fence/resolveStack";

type Props = {
  stack: { blockId: string; mode: "repeat" | "once" }[];
  blocks: FenceBlock[];
  heightM: number;
  azurowoscEnabled?: boolean;
  gapCm?: number;
  className?: string;
};

export function FenceStackPreview({
  stack,
  blocks,
  heightM,
  azurowoscEnabled = false,
  gapCm = 0,
  className,
}: Props) {
  const targetCm = Math.round(heightM * 100);
  const units = resolveStackUnits({
    heightM,
    stack,
    blocks,
    azurowoscEnabled,
    gapCm,
  });

  const blockMap = new Map(blocks.map((b) => [b.id, b]));

  return (
    <div
      className={`flex flex-col items-center rounded-lg border bg-[#f4f4f5] p-4 ${className ?? ""}`}
    >
      <p className="text-muted-foreground mb-3 text-xs font-medium">
        Podgląd · {heightM} m ({targetCm} cm)
        {azurowoscEnabled && gapCm > 0 ? ` · przerwa ${gapCm} cm` : ""}
      </p>
      <div
        className="relative flex w-24 flex-col-reverse overflow-hidden rounded border-2 border-[#333] bg-[#e8e8ea]"
        style={{ height: Math.min(280, Math.max(120, targetCm * 1.2)) }}
      >
        {units.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-2 text-center text-[10px] text-[#888]">
            Brak paneli
          </div>
        ) : (
          units.map((unit, i) => {
            const block = blockMap.get(unit.blockId);
            const blockH = block?.heightCm ?? 50;
            const heightPct = (blockH / targetCm) * 100;
            const gapPct =
              unit.gapAfterPx > 0 ? (unit.gapAfterPx / targetCm) * 100 : 0;
            return (
              <div key={`${unit.blockId}-${i}`} className="w-full shrink-0">
                <div
                  className="flex w-full items-center justify-center border-b border-[#999]/40 bg-gradient-to-r from-[#c8c8cc] to-[#b0b0b6] text-[9px] font-medium text-[#333]"
                  style={{ height: `${heightPct}%`, minHeight: 14 }}
                  title={block?.name}
                >
                  <span className="truncate px-1">
                    {block?.name ?? "?"}
                  </span>
                </div>
                {gapPct > 0 && (
                  <div
                    className="w-full bg-[#f4f4f5]"
                    style={{ height: `${gapPct}%`, minHeight: 4 }}
                    title={`Przerwa ${unit.gapAfterPx} cm`}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
      <p className="text-muted-foreground mt-2 text-[10px]">
        {units.length} {units.length === 1 ? "płyta" : "płyt"} w stosie
      </p>
    </div>
  );
}
