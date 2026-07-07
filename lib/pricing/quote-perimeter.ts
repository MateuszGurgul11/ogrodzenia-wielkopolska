export function estimatePerimeterFromPanels(
  panelCount: number,
  panelWidthCm: number,
): number {
  return panelCount * (panelWidthCm / 100);
}

/** Zgodne z DEFAULT_PREVIEW_PANELS w state — bez importu cyklicznego. */
const DEFAULT_MANUAL_PANEL_COUNT = 5;

export function defaultManualQuotePerimeterM(panelWidthCm: number): number {
  return estimatePerimeterFromPanels(DEFAULT_MANUAL_PANEL_COUNT, panelWidthCm);
}

export type QuoteFenceScope = "full-perimeter" | "front-only";

export function resolveQuotePerimeterM(params: {
  quoteFenceClosed: boolean;
  quotePerimeterM: number | null;
  quoteFenceScope: QuoteFenceScope;
  manualQuotePerimeterM: number;
  manualQuoteFrontLengthM: number;
}): number | null {
  if (
    params.quoteFenceClosed &&
    params.quotePerimeterM != null &&
    params.quotePerimeterM > 0
  ) {
    return params.quotePerimeterM;
  }
  const manualValue =
    params.quoteFenceScope === "front-only"
      ? params.manualQuoteFrontLengthM
      : params.manualQuotePerimeterM;
  if (manualValue > 0) {
    return manualValue;
  }
  return null;
}
