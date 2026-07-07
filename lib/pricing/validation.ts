import { z } from "zod";

export const pricingSettingsSchema = z.object({
  basePricePerMeterNet: z.coerce.number().min(0),
  panelPriceNet: z.coerce.number().min(0),
  panelWidthCm: z.coerce.number().min(50).max(500),
  currency: z.string().min(3).max(3),
});
