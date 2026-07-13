import { buildStackDrawUnits } from "@/lib/fence/buildStackDraw";
import { buildCustomSvgPreview } from "@/lib/fence/sanitizeSvg";
import type { PanelPresetKey } from "@/lib/fence/patterns";
import {
  buildFenceSvg,
  getFenceContentBounds,
  getViewWidth,
  VIEW_H,
} from "@/lib/fence/renderFence";
import { resolvePostHeightCm } from "@/lib/fence/resolveStack";
import { resolvePostTextureUrl } from "@/lib/fence/resolveTexture";
import {
  getStackVersions,
} from "@/lib/fence/stackVersions";
import type {
  CatalogCollections,
  Color,
  FenceStackVersion,
  FenceVariant,
  Height,
} from "@/lib/types";

const DEFAULT_PREVIEW_COLOR = "#b0b0b4";
const DEFAULT_PANEL_COUNT = 3;

export type FenceGalleryItem = {
  variantId: string;
  variantName: string;
  versionId: string;
  versionName: string;
  active: boolean;
  heightLabel: string;
  heightM: number;
  colorLabel: string;
  colorHex: string;
  blockSummary: string;
  azurowoscEnabled: boolean;
  svg: string;
};

export type BuildVariantPreviewOptions = {
  heightId?: string | null;
  colorId?: string | null;
  stackVersionId?: string | null;
  panelCount?: number;
  azurowoscEnabled?: boolean;
  azurowoscGapCm?: number | null;
  transparent?: boolean;
  crop?: boolean;
};

function resolvePreviewHeight(
  catalog: CatalogCollections,
  variant: FenceVariant,
  heightId?: string | null,
): Height | null {
  const heights = [...catalog.heights]
    .filter((h) => h.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (heightId) {
    const selected = catalog.heights.find((h) => h.id === heightId);
    if (selected) return selected;
  }

  for (const id of variant.heightIds) {
    const match = catalog.heights.find((h) => h.id === id);
    if (match) return match;
  }

  return (
    heights.find((h) => h.valueM === 2) ??
    heights.find((h) => h.valueM === 2.0) ??
    heights[0] ??
    null
  );
}

function resolvePreviewColor(
  catalog: CatalogCollections,
  variant: FenceVariant,
  colorId?: string | null,
): Color | null {
  const colors = [...catalog.colors]
    .filter((c) => c.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (colorId) {
    const selected = catalog.colors.find((c) => c.id === colorId);
    if (selected) return selected;
  }

  if (variant.azurowoscColorId) {
    const azurColor = catalog.colors.find((c) => c.id === variant.azurowoscColorId);
    if (azurColor) return azurColor;
  }

  return colors[0] ?? null;
}

function summarizeStack(
  catalog: CatalogCollections,
  version: FenceStackVersion,
): string {
  const names = version.stack
    .map((slot) => catalog.fenceBlocks.find((b) => b.id === slot.blockId)?.name)
    .filter((name): name is string => Boolean(name));

  if (!names.length) return "Brak paneli w układzie";
  return names.join(" · ");
}

/** Podgląd pojedynczej płyty (jeden preset lub własny SVG) — przycięty do samego panelu. */
export function buildPanelBlockPreviewSvg(options: {
  patternKey?: PanelPresetKey;
  svgMarkup?: string | null;
  heightCm: number;
  role: "standard" | "cap";
  colorHex?: string;
  seed?: number;
}): string {
  if (options.svgMarkup?.trim()) {
    return buildCustomSvgPreview(options.svgMarkup);
  }

  const patternKey = options.patternKey ?? "concrete-standard";
  const heightM = Math.max(options.heightCm, 10) / 100;
  const svg = buildFenceSvg({
    heightM,
    patternId: "pattern-solid",
    colorHex: options.colorHex ?? DEFAULT_PREVIEW_COLOR,
    postWidthCm: 20,
    panelCount: 1,
    transparent: true,
    stackUnits: [
      {
        heightCm: options.heightCm,
        gapAfterCm: 0,
        isGap: false,
        role: options.role,
        patternKey,
        seed: options.seed ?? 0,
      },
    ],
  });
  const viewW = getViewWidth(1);
  const bounds = getFenceContentBounds({
    heightM,
    postWidthCm: 20,
    panelCount: 1,
  });
  const pad = 6;
  const vb = `${(bounds.x - pad).toFixed(1)} ${(bounds.y - pad).toFixed(1)} ${(bounds.width + pad * 2).toFixed(1)} ${(bounds.height + pad * 2).toFixed(1)}`;
  return svg.replace(`viewBox="0 0 ${viewW} ${VIEW_H}"`, `viewBox="${vb}"`);
}

export function buildVariantPreviewSvg(
  catalog: CatalogCollections,
  variant: FenceVariant,
  options: BuildVariantPreviewOptions = {},
): string | null {
  const post = catalog.posts.find((p) => p.id === variant.postId);
  const height = resolvePreviewHeight(catalog, variant, options.heightId);
  const color = resolvePreviewColor(catalog, variant, options.colorId);
  if (!post || !height || !color) return null;

  const versions = getStackVersions(variant);
  const version =
    versions.find((v) => v.id === options.stackVersionId) ?? versions[0];
  if (!version) return null;

  const panelCount = options.panelCount ?? DEFAULT_PANEL_COUNT;
  const azurowoscEnabled = options.azurowoscEnabled ?? false;
  const stackUnits = buildStackDrawUnits({
    catalog,
    variant,
    stackVersionId: version.id,
    heightM: height.valueM,
    colorId: color.id,
    azurowoscEnabled,
    azurowoscGapCm: options.azurowoscGapCm ?? null,
  });

  if (!stackUnits.length) return null;

  const svg = buildFenceSvg({
    heightM: height.valueM,
    patternId: "pattern-solid",
    colorHex: color.hex || DEFAULT_PREVIEW_COLOR,
    postWidthCm: post.widthCm,
    panelCount,
    transparent: options.transparent ?? true,
    postTextureUrl: resolvePostTextureUrl(catalog, variant.postId, color.id),
    stackUnits,
    postHeightCm: resolvePostHeightCm(version, height.valueM),
  });

  if (options.crop === false) return svg;

  const viewW = getViewWidth(panelCount);
  const bounds = getFenceContentBounds({
    heightM: height.valueM,
    postWidthCm: post.widthCm,
    panelCount,
    postHeightCm: resolvePostHeightCm(version, height.valueM),
  });
  const pad = 8;
  const vb = `${(bounds.x - pad).toFixed(1)} ${(bounds.y - pad).toFixed(1)} ${(bounds.width + pad * 2).toFixed(1)} ${(bounds.height + pad * 2).toFixed(1)}`;

  return svg.replace(`viewBox="0 0 ${viewW} ${VIEW_H}"`, `viewBox="${vb}"`);
}

export function buildFenceGalleryItems(
  catalog: CatalogCollections,
  variants: FenceVariant[],
  options: Omit<BuildVariantPreviewOptions, "stackVersionId"> = {},
): FenceGalleryItem[] {
  const sorted = [...variants].sort((a, b) => a.sortOrder - b.sortOrder);
  const items: FenceGalleryItem[] = [];

  for (const variant of sorted) {
    const height = resolvePreviewHeight(catalog, variant, options.heightId);
    const color = resolvePreviewColor(catalog, variant, options.colorId);
    if (!height || !color) continue;

    const versions = getStackVersions(variant);
    for (const version of versions) {
      const svg = buildVariantPreviewSvg(catalog, variant, {
        ...options,
        stackVersionId: version.id,
        heightId: height.id,
        colorId: color.id,
      });
      if (!svg) continue;

      items.push({
        variantId: variant.id,
        variantName: variant.name,
        versionId: version.id,
        versionName: version.name,
        active: variant.active,
        heightLabel: height.label,
        heightM: height.valueM,
        colorLabel: color.name,
        colorHex: color.hex,
        blockSummary: summarizeStack(catalog, version),
        azurowoscEnabled: version.azurowoscEnabled,
        svg,
      });
    }
  }

  return items;
}
