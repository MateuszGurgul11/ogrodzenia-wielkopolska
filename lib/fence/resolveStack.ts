import type {
  CatalogCollections,
  FenceAzurUnit,
  FenceBlock,
  FenceStackSlot,
  FenceStackVersion,
  FenceVariant,
} from "@/lib/types";
import {
  applyStackVersionToVariant,
  getStackVersions,
  resolveStackVersion,
} from "@/lib/fence/stackVersions";

export type ResolvedStackUnit = {
  blockId: string;
  index: number;
  gapAfterPx: number;
};

export type VariantUnit = {
  blockId: string | null;
  heightCm: number;
  isGap: boolean;
};

export type StackValidation = {
  valid: boolean;
  usedHeightCm: number;
  targetHeightCm: number;
  remainderCm: number;
  message?: string;
};

export type StackResolveOptions = {
  heightM: number;
  stack: FenceStackSlot[];
  blocks: FenceBlock[];
  azurowoscEnabled: boolean;
  /** Przerwa z presetu ażurowości (cm). */
  gapCm?: number;
};

function getBlock(blocks: FenceBlock[], blockId: string): FenceBlock | undefined {
  return blocks.find((b) => b.id === blockId);
}

export function resolveAzurowoscPreset(
  catalog: CatalogCollections,
  presetId: string | null | undefined,
): { gapCm: number; name: string } | undefined {
  if (!presetId) return undefined;
  const preset = catalog.azurowoscPresets.find((p) => p.id === presetId);
  if (!preset) return undefined;
  return { gapCm: preset.gapCm, name: preset.name };
}

export function resolveAzurowoscGap(
  catalog: CatalogCollections,
  variant: FenceVariant,
): number {
  return resolveAzurowoscPreset(catalog, variant.azurowoscPresetId)?.gapCm ?? 0;
}

export function versionSupportsAzurowosc(version: FenceStackVersion): boolean {
  if (!version.azurowoscEnabled) return false;
  return Boolean(version.azurowoscOptions?.length);
}

/** @deprecated Użyj versionSupportsAzurowosc na aktywnej wersji. */
export function variantSupportsAzurowosc(
  variant: FenceVariant,
  stackVersionId?: string | null,
): boolean {
  const version = resolveStackVersion(variant, stackVersionId);
  return versionSupportsAzurowosc(version);
}

/** Posortowane rosnąco przerwy (cm) dostępne dla wersji stosu. */
export function getAzurGapOptions(version: FenceStackVersion): number[] {
  return [...(version.azurowoscOptions ?? [])]
    .map((o) => o.gapCm)
    .sort((a, b) => a - b);
}

/** Efektywna wysokość słupka (cm) dla danej wysokości płotu i wersji układu paneli. */
export function resolvePostHeightCm(
  version: FenceStackVersion,
  heightM: number,
): number | undefined {
  if (version.postHeightOffsetCm != null) {
    return Math.max(10, Math.round(heightM * 100) + version.postHeightOffsetCm);
  }
  return version.postHeightCm ?? undefined;
}

/**
 * Automatyczny układ ażurowości: przerwy między panelami mają DOKŁADNIE
 * `gapCm`. Paneli zostaje tyle, ile zmieści się w wysokości płotu; ewentualna
 * reszta miejsca zostaje jako luz na samej górze. Panel górny (slot "once")
 * zawsze zostaje na szczycie. Kolejność: od góry do dołu.
 */
export function buildAzurAutoLayout(options: {
  stack: FenceStackSlot[];
  blocks: FenceBlock[];
  heightM: number;
  gapCm: number;
}): FenceAzurUnit[] {
  const { stack, blocks, heightM, gapCm } = options;
  const full = buildFullStackLayout({ stack, blocks, heightM });
  if (gapCm <= 0 || full.length < 2) return full;

  const targetCm = Math.round(heightM * 100);
  const onceSlot = stack.find((s) => s.mode === "once");
  const topBlock = onceSlot ? getBlock(blocks, onceSlot.blockId) : undefined;
  const topUnit = topBlock
    ? full.find((u) => u.blockId === topBlock.id)
    : undefined;
  const mainUnits = topUnit ? full.filter((u) => u !== topUnit) : full;
  if (mainUnits.length === 0) return full;

  const topH = topUnit?.heightCm ?? 0;

  let chosenMain = 1;
  let usedCm = topH + (mainUnits[0]?.heightCm ?? 0) + (topUnit ? gapCm : 0);
  for (let k = mainUnits.length; k >= 1; k--) {
    const panelsSum =
      topH + mainUnits.slice(0, k).reduce((s, u) => s + u.heightCm, 0);
    const gapCount = k + (topUnit ? 1 : 0) - 1;
    const total = panelsSum + gapCount * gapCm;
    if (total <= targetCm) {
      chosenMain = k;
      usedCm = total;
      break;
    }
  }

  const panels: FenceAzurUnit[] = [
    ...(topUnit ? [topUnit] : []),
    ...mainUnits.slice(0, chosenMain),
  ];
  if (panels.length < 2) return full;

  const airCm = Math.max(0, targetCm - usedCm);
  const units: FenceAzurUnit[] = [];
  if (airCm >= 1) {
    units.push({ blockId: null, isGap: true, heightCm: airCm });
  }
  panels.forEach((panel, i) => {
    units.push({ ...panel });
    if (i < panels.length - 1) {
      units.push({ blockId: null, isGap: true, heightCm: gapCm });
    }
  });
  return units;
}

/**
 * Układ ażurowości dla wybranej przerwy i wysokości: ręcznie zapisany, a gdy
 * go brak — wygenerowany automatycznie.
 */
export function resolveAzurLayout(options: {
  version: FenceStackVersion;
  variant?: FenceVariant;
  blocks: FenceBlock[];
  heightM: number;
  gapCm?: number | null;
}): FenceAzurUnit[] | null {
  const { version, variant, blocks, heightM, gapCm } = options;
  const azurOptions = version.azurowoscOptions ?? [];

  if (azurOptions.length > 0) {
    const option =
      azurOptions.find((o) => gapCm != null && o.gapCm === gapCm) ??
      azurOptions[0];
    const saved = option.layouts?.find(
      (l) => Math.abs(l.heightM - heightM) < 0.01,
    );
    if (saved?.units.length) return saved.units;
    return buildAzurAutoLayout({
      stack: version.stack,
      blocks,
      heightM,
      gapCm: option.gapCm,
    });
  }

  // Stary format: pojedynczy układ zaprojektowany dla jednej wysokości.
  if (
    variant?.azurowoscLayout?.length &&
    (variant.azurowoscDesignHeightM == null ||
      Math.abs(variant.azurowoscDesignHeightM - heightM) < 0.01)
  ) {
    return variant.azurowoscLayout;
  }
  return null;
}

export function buildFullStackLayout(options: {
  stack: FenceStackSlot[];
  blocks: FenceBlock[];
  heightM: number;
}): FenceAzurUnit[] {
  const units = resolveStackUnits({
    heightM: options.heightM,
    stack: options.stack,
    blocks: options.blocks,
    azurowoscEnabled: false,
    gapCm: 0,
  });

  return units.map((unit) => {
    const block = getBlock(options.blocks, unit.blockId);
    return {
      blockId: unit.blockId,
      isGap: false,
      heightCm: block?.heightCm ?? 50,
    };
  });
}

export function resolveVariantUnits(options: {
  variant: FenceVariant;
  stackVersionId?: string | null;
  blocks: FenceBlock[];
  heightM: number;
  azurowoscEnabled: boolean;
  azurowoscGapCm?: number | null;
}): VariantUnit[] {
  const {
    variant,
    stackVersionId,
    blocks,
    heightM,
    azurowoscEnabled,
    azurowoscGapCm,
  } = options;

  const version = resolveStackVersion(variant, stackVersionId);

  if (azurowoscEnabled) {
    const layout = resolveAzurLayout({
      version,
      variant,
      blocks,
      heightM,
      gapCm: azurowoscGapCm,
    });
    if (layout?.length) {
      return layout.map((u) => ({
        blockId: u.blockId,
        heightCm: u.heightCm,
        isGap: u.isGap,
      }));
    }
  }

  const units = resolveStackUnits({
    heightM,
    stack: version.stack,
    blocks,
    azurowoscEnabled: false,
    gapCm: 0,
  });

  return units.map((unit) => {
    const block = getBlock(blocks, unit.blockId);
    return {
      blockId: unit.blockId,
      heightCm: block?.heightCm ?? 50,
      isGap: false,
    };
  });
}

export function countPanelsInLayout(layout: FenceAzurUnit[]): number {
  return layout.filter((u) => !u.isGap && u.blockId).length;
}

export function resolveStackUnits(options: StackResolveOptions): ResolvedStackUnit[] {
  const { heightM, stack, blocks, azurowoscEnabled, gapCm: presetGapCm = 0 } =
    options;
  const targetCm = Math.round(heightM * 100);
  const units: ResolvedStackUnit[] = [];
  let remainingCm = targetCm;
  let index = 0;

  for (const slot of stack) {
    const block = getBlock(blocks, slot.blockId);
    if (!block) continue;

    if (slot.mode === "once") {
      if (remainingCm < block.heightCm) break;
      units.push({ blockId: slot.blockId, index: index++, gapAfterPx: 0 });
      remainingCm -= block.heightCm;
      continue;
    }

    const useGap = azurowoscEnabled && presetGapCm > 0;
    const gapCm = useGap ? presetGapCm : 0;

    while (remainingCm >= block.heightCm) {
      const nextWouldFit =
        remainingCm - block.heightCm >= block.heightCm + gapCm ||
        remainingCm - block.heightCm === block.heightCm;
      units.push({
        blockId: slot.blockId,
        index: index++,
        gapAfterPx: useGap && nextWouldFit ? gapCm : 0,
      });
      remainingCm -= block.heightCm;
      if (useGap && remainingCm >= gapCm + block.heightCm) {
        remainingCm -= gapCm;
      } else if (useGap && remainingCm > block.heightCm) {
        remainingCm -= gapCm;
      }
      if (remainingCm < block.heightCm) break;
    }
  }

  return units;
}

export function validateStack(options: StackResolveOptions): StackValidation {
  const units = resolveStackUnits(options);
  const targetHeightCm = Math.round(options.heightM * 100);
  let usedHeightCm = 0;

  for (const unit of units) {
    const block = getBlock(options.blocks, unit.blockId);
    if (!block) continue;
    usedHeightCm += block.heightCm + unit.gapAfterPx;
  }

  const remainderCm = targetHeightCm - usedHeightCm;
  const valid = Math.abs(remainderCm) < 2;

  return {
    valid,
    usedHeightCm,
    targetHeightCm,
    remainderCm,
    message: valid
      ? undefined
      : `Stos zajmuje ${usedHeightCm} cm z ${targetHeightCm} cm (różnica ${remainderCm} cm)`,
  };
}

export function getBlocksUsedInVariant(
  variant: FenceVariant,
  blocks: FenceBlock[],
): FenceBlock[] {
  const ids = new Set<string>();
  for (const version of getStackVersions(variant)) {
    for (const slot of version.stack) {
      ids.add(slot.blockId);
    }
  }
  return blocks.filter((b) => ids.has(b.id));
}

export function resolveFenceVariant(
  catalog: CatalogCollections,
  variantId: string | null,
): FenceVariant | undefined {
  if (!variantId) return undefined;
  return catalog.fenceVariants.find((v) => v.id === variantId);
}

export function resolveBlockTextureUrl(
  catalog: CatalogCollections,
  blockId: string,
  colorId: string | null,
): string | null {
  if (colorId) {
    const match = catalog.fenceBlockTextures.find(
      (t) => t.blockId === blockId && t.colorId === colorId,
    );
    if (match?.imageUrl) return match.imageUrl;
  }
  const block = catalog.fenceBlocks.find((b) => b.id === blockId);
  return block?.baseTextureUrl ?? null;
}

export function resolveBlockUnitPrice(
  catalog: CatalogCollections,
  blockId: string,
  colorId: string | null,
): number {
  if (colorId) {
    const match = catalog.fenceBlockTextures.find(
      (t) => t.blockId === blockId && t.colorId === colorId,
    );
    if (match) return match.priceNetPerUnit;
  }
  return 0;
}

export function resolvePostUnitPrice(
  catalog: CatalogCollections,
  postId: string | null,
  colorId: string | null,
): number {
  if (!postId || !colorId) return 0;
  const match = catalog.postTextures.find(
    (t) => t.postId === postId && t.colorId === colorId,
  );
  return match?.priceNetPerPost ?? 0;
}

export { applyStackVersionToVariant, getStackVersions, resolveStackVersion };
