import type { CatalogCollections, FenceVariant } from "@/lib/types";
import type { StackDrawUnit } from "@/lib/fence/renderFence";
import {
  resolveBlockTextureUrl,
  resolveVariantUnits,
} from "@/lib/fence/resolveStack";

function orderStackForDraw(
  units: StackDrawUnit[],
  preserveOrder: boolean,
): StackDrawUnit[] {
  if (preserveOrder) return units;
  const caps = units.filter((u) => !u.isGap && u.role === "cap");
  const rest = units.filter((u) => u.isGap || u.role !== "cap");
  return [...caps, ...rest];
}

export function buildStackDrawUnits(options: {
  catalog: CatalogCollections;
  variant: FenceVariant;
  stackVersionId?: string | null;
  heightM: number;
  colorId: string | null;
  azurowoscEnabled: boolean;
  azurowoscGapCm?: number | null;
}): StackDrawUnit[] {
  const {
    catalog,
    variant,
    stackVersionId,
    heightM,
    colorId,
    azurowoscEnabled,
    azurowoscGapCm,
  } = options;
  const units = resolveVariantUnits({
    variant,
    stackVersionId: options.stackVersionId,
    blocks: catalog.fenceBlocks,
    heightM,
    azurowoscEnabled,
    azurowoscGapCm,
  });

  // Układ ażurowości ma już kolejność rysowania (od góry do dołu).
  const preserveOrder = azurowoscEnabled && units.some((u) => u.isGap);

  const mapped = units.map((unit, index) => {
    if (unit.isGap) {
      return {
        textureUrl: null,
        heightCm: unit.heightCm,
        gapAfterCm: 0,
        isGap: true,
        seed: index,
      };
    }
    const block = unit.blockId
      ? catalog.fenceBlocks.find((b) => b.id === unit.blockId)
      : undefined;
    return {
      textureUrl: unit.blockId
        ? resolveBlockTextureUrl(catalog, unit.blockId, colorId)
        : null,
      heightCm: unit.heightCm,
      gapAfterCm: 0,
      isGap: false,
      role: block?.role ?? "standard",
      patternKey: block?.patternKey,
      seed: index,
    };
  });

  return orderStackForDraw(mapped, preserveOrder);
}
