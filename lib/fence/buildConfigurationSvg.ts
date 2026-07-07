import type { PatternId } from "@/lib/fence/patterns";
import { buildStackDrawUnits } from "@/lib/fence/buildStackDraw";
import { buildFenceSvg } from "@/lib/fence/renderFence";
import {
  type GatePosition,
  type ProductScope,
  getGatePanelIndex,
} from "@/lib/configurator/state";
import { resolveOpeningTextureUrl, resolvePostTextureUrl } from "@/lib/fence/resolveTexture";
import {
  resolveFenceVariant,
  resolvePostHeightCm,
} from "@/lib/fence/resolveStack";
import type {
  CatalogCollections,
  ConfiguratorSelection,
  PricingSettings,
} from "@/lib/types";

export type ConfigurationSvgInput = {
  catalog: CatalogCollections;
  selection: ConfiguratorSelection;
  pricing: PricingSettings;
  scope: ProductScope;
  previewPanelCount: number;
  bramaEnabled: boolean;
  bramaElementId: string | null;
  furtkaEnabled: boolean;
  furtkaElementId: string | null;
  furtkaPosition: GatePosition;
};

type PdfPanelLayout = {
  panelCount: number;
  openingPanelIndices: number[];
};

function resolvePdfPanelLayout(input: ConfigurationSvgInput): PdfPanelLayout {
  const hasDrivewayGate =
    input.scope.gate && input.bramaEnabled && Boolean(input.bramaElementId);
  const hasWicket =
    input.scope.wicket &&
    input.furtkaEnabled &&
    Boolean(input.furtkaElementId);

  if (!input.scope.fence) {
    const panelCount = hasDrivewayGate ? 2 : hasWicket ? 1 : 0;
    const openingPanelIndices: number[] = [];
    if (hasWicket && !hasDrivewayGate) {
      openingPanelIndices.push(0);
    }
    return { panelCount, openingPanelIndices };
  }

  let panelCount = Math.min(Math.max(input.previewPanelCount, 3), 5);

  if (hasDrivewayGate && hasWicket) {
    panelCount = Math.max(panelCount, 5);
  } else if (hasDrivewayGate) {
    panelCount = Math.max(panelCount, 4);
  } else if (hasWicket) {
    panelCount = Math.max(panelCount, 3);
  }

  const openingPanelIndices: number[] = [];
  if (hasWicket) {
    openingPanelIndices.push(
      getGatePanelIndex(input.furtkaPosition, panelCount),
    );
  }

  return { panelCount, openingPanelIndices };
}

export function buildConfigurationSvg(
  input: ConfigurationSvgInput,
): string | null {
  const { catalog, selection } = input;

  const variant = resolveFenceVariant(catalog, selection.fenceVariantId);
  const post = catalog.posts.find((p) => p.id === variant?.postId);
  const height = catalog.heights.find((h) => h.id === selection.heightId);
  const color = catalog.colors.find((c) => c.id === selection.colorId);

  if (!variant || !post || !height || !color) return null;

  const { panelCount, openingPanelIndices } = resolvePdfPanelLayout(input);

  if (panelCount === 0) return null;

  const hasWicket =
    input.scope.wicket &&
    input.furtkaEnabled &&
    Boolean(input.furtkaElementId);
  const hasDrivewayGate =
    input.scope.gate && input.bramaEnabled && Boolean(input.bramaElementId);

  const stackUnits = buildStackDrawUnits({
    catalog,
    variant,
    stackVersionId: selection.stackVersionId,
    heightM: height.valueM,
    colorId: selection.colorId,
    azurowoscEnabled: selection.azurowoscEnabled,
    azurowoscGapCm: selection.azurowoscGapCm,
  });

  const postTextureUrl = resolvePostTextureUrl(
    catalog,
    variant.postId,
    selection.colorId,
  );
  const openingTextureUrl = hasWicket
    ? resolveOpeningTextureUrl(catalog, "furtka", input.furtkaElementId)
    : hasDrivewayGate
      ? resolveOpeningTextureUrl(catalog, "brama", input.bramaElementId)
      : null;

  return buildFenceSvg({
    heightM: height.valueM,
    patternId: "pattern-solid" as PatternId,
    colorHex: color.hex,
    postWidthCm: post.widthCm,
    panelCount,
    openingPanelIndices,
    transparent: false,
    postTextureUrl,
    openingTextureUrl,
    stackUnits,
    postHeightCm: resolvePostHeightCm(variant, height.valueM),
  });
}
