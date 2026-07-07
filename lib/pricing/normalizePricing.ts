import type { PricingSettings } from "@/lib/types";
import { DEFAULT_PRICING_SETTINGS } from "@/lib/pricing/defaults";

type RawPricingSettings = Partial<PricingSettings> & {
  gatePriceNet?: number;
  bramaPriceNet?: number;
  furtkaPriceNet?: number;
};

export function normalizePricingSettings(
  raw: RawPricingSettings,
): PricingSettings {
  const panelWidthCm = raw.panelWidthCm ?? DEFAULT_PRICING_SETTINGS.panelWidthCm;
  const basePricePerMeterNet =
    raw.basePricePerMeterNet ?? DEFAULT_PRICING_SETTINGS.basePricePerMeterNet;
  const panelPriceNet =
    raw.panelPriceNet ??
    basePricePerMeterNet * (panelWidthCm / 100);

  return {
    basePricePerMeterNet,
    panelPriceNet,
    panelWidthCm,
    currency: raw.currency ?? DEFAULT_PRICING_SETTINGS.currency,
  };
}
