/** Dopłata za panel — preferuje priceSurchargePerPanel, fallback z PLN/m. */
export function resolveSurchargePerPanel(
  priceSurchargePerPanel: number | undefined,
  priceSurchargePerMeter: number | undefined,
  panelWidthCm: number,
): number {
  if (priceSurchargePerPanel != null) {
    return priceSurchargePerPanel;
  }
  return (priceSurchargePerMeter ?? 0) * (panelWidthCm / 100);
}
