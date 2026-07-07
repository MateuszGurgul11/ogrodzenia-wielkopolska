import type {
  CatalogCollections,
  ConfiguratorSelection,
  PricingSettings,
  QuoteResult,
} from "@/lib/types";
import { MIN_PREVIEW_PANELS } from "@/lib/configurator/state";
import {
  getDrivewayGateSpanM,
  getWicketWidthCm,
} from "@/lib/pricing/variant-prices";
import { resolveElement, resolveElementPriceNet } from "@/lib/pricing/element-prices";
import { resolveFenceVariant } from "@/lib/fence/resolveStack";
import { calculateFenceQuote } from "@/lib/pricing/calculateFenceQuote";

type QuoteInput = {
  catalog: CatalogCollections;
  selection: ConfiguratorSelection;
  pricing?: PricingSettings | null;
  perimeterM?: number | null;
  fenceEnabled?: boolean;
  bramaEnabled?: boolean;
  bramaElementId?: string | null;
  bramaOccupiedSpanM?: number | null;
  furtkaEnabled?: boolean;
  furtkaElementId?: string | null;
  furtkaPositionLabel?: string;
  fallbackPanelCount?: number;
};

function formatBramaValue(
  enabled: boolean,
  elementName: string | undefined,
  spanM: number,
): string {
  if (!enabled) return "Nie";
  const label = elementName ?? "Brama";
  if (spanM <= 0) return `${label} · cena stała`;
  return `${label} · ${spanM.toFixed(1)} m na rzucie`;
}

function formatFurtkaValue(
  enabled: boolean,
  elementName: string | undefined,
  positionLabel?: string,
): string {
  if (!enabled) return "Nie";
  const label = elementName ?? "Furtka";
  return positionLabel ? `${label} · ${positionLabel}` : `${label} · cena stała`;
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const { catalog, selection } = input;
  const fenceEnabled = input.fenceEnabled ?? true;
  const currency = input.pricing?.currency ?? "PLN";

  const bramaEnabled = Boolean(input.bramaElementId);
  const furtkaEnabled = input.furtkaEnabled ?? Boolean(input.furtkaElementId);
  const bramaElement = bramaEnabled
    ? resolveElement(catalog, "brama", input.bramaElementId)
    : undefined;
  const furtkaElement = furtkaEnabled
    ? resolveElement(catalog, "furtka", input.furtkaElementId)
    : undefined;

  if (!fenceEnabled) {
    const bramaUnitPrice = resolveElementPriceNet(
      catalog,
      "brama",
      input.bramaElementId ?? bramaElement?.id,
    );
    const furtkaUnitPrice = resolveElementPriceNet(
      catalog,
      "furtka",
      input.furtkaElementId ?? furtkaElement?.id,
    );
    const bramaPrice = bramaEnabled ? bramaUnitPrice : 0;
    const furtkaPrice = furtkaEnabled ? furtkaUnitPrice : 0;
    return {
      perimeterM: 0,
      estimatedPanels: 0,
      panelUnits: 0,
      pricePerPanelNet: 0,
      pricePerMeterNet: 0,
      fenceSubtotal: 0,
      postsSubtotal: 0,
      bramaPrice,
      furtkaPrice,
      totalNet: bramaPrice + furtkaPrice,
      currency,
      breakdown: [],
      configurationItems: [
        {
          label: "Brama wjazdowa",
          value: formatBramaValue(bramaEnabled, bramaElement?.name, 0),
        },
        {
          label: "Furtka",
          value: formatFurtkaValue(
            furtkaEnabled,
            furtkaElement?.name,
            input.furtkaPositionLabel,
          ),
        },
      ],
      hasMeasuredPerimeter: false,
    };
  }

  const variant = resolveFenceVariant(catalog, selection.fenceVariantId);
  const height = catalog.heights.find((h) => h.id === selection.heightId);
  const heightM = height?.valueM ?? 2;

  if (!variant) {
    return {
      perimeterM: 0,
      estimatedPanels: MIN_PREVIEW_PANELS,
      panelUnits: MIN_PREVIEW_PANELS,
      pricePerPanelNet: 0,
      pricePerMeterNet: 0,
      fenceSubtotal: 0,
      postsSubtotal: 0,
      bramaPrice: 0,
      furtkaPrice: 0,
      totalNet: 0,
      currency,
      breakdown: [],
      configurationItems: [],
      hasMeasuredPerimeter: false,
    };
  }

  return calculateFenceQuote({
    catalog,
    selection,
    variant,
    heightM,
    perimeterM: input.perimeterM,
    azurowoscEnabled: selection.azurowoscEnabled,
    bramaEnabled,
    bramaElementId: input.bramaElementId,
    bramaOccupiedSpanM: input.bramaOccupiedSpanM,
    furtkaEnabled,
    furtkaElementId: input.furtkaElementId,
    furtkaPositionLabel: input.furtkaPositionLabel,
    fallbackPanelCount: input.fallbackPanelCount,
    currency,
  });
}
