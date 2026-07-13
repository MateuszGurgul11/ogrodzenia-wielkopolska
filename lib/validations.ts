import { z } from "zod";
import { PANEL_PRESET_KEYS } from "@/lib/fence/patterns";

/** Firestore zwraca null dla pustych pól opcjonalnych — akceptuj null i pusty string. */
const optionalString = z.preprocess(
  (val) => (val === null || val === undefined ? undefined : String(val)),
  z.string().optional(),
);

const optionalUrl = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === "") return undefined;
    return String(val);
  },
  z.string().url("Podaj poprawny URL").optional(),
);

/** URL opcjonalny — pusty string lub null jawnie czyści pole w Firestore. */
const clearableUrl = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === "") return null;
    return String(val);
  },
  z.union([z.string().url("Podaj poprawny URL"), z.null()]),
);

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Kolor musi być w formacie #RRGGBB");

export const postSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug: małe litery, cyfry i myślniki"),
  description: optionalString,
  previewAsset: optionalString,
  baseTextureUrl: clearableUrl,
  widthCm: z.coerce.number().min(10).max(50),
  priceSurchargePerPanel: z.coerce.number().min(0).optional(),
  priceSurchargePerMeter: z.coerce.number().min(0).default(0),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const panelSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  patternId: z.enum([
    "pattern-solid",
    "pattern-lines",
    "pattern-grid",
    "pattern-brick",
  ]),
  priceSurchargePerPanel: z.coerce.number().min(0).optional(),
  priceSurchargePerMeter: z.coerce.number().min(0).default(0),
  description: optionalString,
  previewAsset: optionalString,
  baseTextureUrl: clearableUrl,
  textureTileHeightM: z.coerce.number().min(0.1).max(2.25).optional(),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const spacerSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  hasSpacer: z.boolean(),
  openness: z.coerce.number().min(0).max(1),
  priceSurchargePerPanel: z.coerce.number().min(0).optional(),
  priceSurchargePerMeter: z.coerce.number().min(0).default(0),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const heightSchema = z.object({
  label: z.string().min(1, "Etykieta jest wymagana"),
  valueM: z.coerce.number().min(1).max(2.25),
  priceMultiplier: z.coerce.number().min(0.1).max(5).default(1),
  description: optionalString,
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const colorSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  hex: hexColorSchema,
  priceSurchargePerPanel: z.coerce.number().min(0).optional(),
  priceSurchargePerMeter: z.coerce.number().min(0).default(0),
  description: optionalString,
  previewAsset: optionalString,
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const elementSchema = z.object({
  type: z.enum(["brama", "furtka"]),
  name: z.string().min(1, "Nazwa jest wymagana"),
  description: optionalString,
  textureUrl: clearableUrl,
  priceNet: z.coerce.number().min(0).default(0),
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const panelTextureSchema = z.object({
  panelId: z.string().min(1),
  colorId: z.string().min(1),
  imageUrl: z.string().url("Podaj poprawny URL zdjęcia"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const postTextureSchema = z.object({
  postId: z.string().min(1),
  colorId: z.string().min(1),
  imageUrl: z.string().url("Podaj poprawny URL zdjęcia"),
  priceNetPerPost: z.coerce.number().min(0).default(0),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const fenceBlockSchema = z
  .object({
    name: z.string().min(1, "Nazwa jest wymagana"),
    heightCm: z.coerce.number().min(5).max(250),
    role: z.enum(["standard", "cap"]),
    patternKey: z.enum(PANEL_PRESET_KEYS).optional(),
    svgMarkup: z.preprocess(
      (val) => {
        if (val === null || val === undefined || val === "") return undefined;
        return String(val);
      },
      z.string().min(10, "SVG jest za krótki").max(200_000).optional(),
    ),
    supportsAzurowosc: z.boolean(),
    description: optionalString,
    baseTextureUrl: clearableUrl,
    sortOrder: z.coerce.number().int().min(0),
    active: z.boolean(),
  })
  .refine((data) => Boolean(data.patternKey || data.svgMarkup), {
    message: "Wybierz wzór proceduralny lub wgraj własny SVG",
    path: ["svgMarkup"],
  });

export const fenceStackSlotSchema = z.object({
  blockId: z.string().min(1),
  mode: z.enum(["repeat", "once"]),
  gapCm: z.coerce.number().min(0).max(50).optional(),
  mirrorsMain: z.boolean().optional(),
});

export const azurowoscPresetSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  gapCm: z.coerce.number().min(0).max(50),
  description: optionalString,
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const fenceAzurUnitSchema = z.object({
  blockId: z.string().nullable(),
  isGap: z.boolean(),
  heightCm: z.coerce.number().min(1).max(250),
});

export const fenceAzurLayoutByHeightSchema = z.object({
  heightM: z.coerce.number().min(0.5).max(4),
  units: z.array(fenceAzurUnitSchema).min(1),
});

export const fenceAzurOptionSchema = z.object({
  gapCm: z.coerce.number().min(1, "Przerwa musi mieć co najmniej 1 cm").max(100),
  layouts: z.array(fenceAzurLayoutByHeightSchema).default([]),
});

export const fenceStackVersionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Nazwa wersji jest wymagana"),
  stack: z.array(fenceStackSlotSchema).min(1, "Dodaj co najmniej jeden slot"),
  azurowoscEnabled: z.boolean(),
  azurowoscOptions: z.array(fenceAzurOptionSchema).nullable().optional(),
  azurowoscColorId: z.string().nullable().optional(),
  postHeightCm: z.coerce.number().min(50).max(300).nullable().optional(),
  postHeightOffsetCm: z.coerce.number().min(-150).max(150).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0),
});

export const fenceVariantSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  postId: z.string().min(1, "Wybierz słupek"),
  stack: z.array(fenceStackSlotSchema).min(1, "Dodaj co najmniej jeden slot"),
  stackVersions: z
    .array(fenceStackVersionSchema)
    .min(1, "Dodaj co najmniej jedną wersję układu")
    .nullable()
    .optional(),
  azurowoscEnabled: z.boolean(),
  azurowoscPresetId: z.string().nullable().optional(),
  azurowoscOptions: z.array(fenceAzurOptionSchema).nullable().optional(),
  azurowoscLayout: z.array(fenceAzurUnitSchema).nullable().optional(),
  azurowoscDesignHeightM: z.coerce.number().min(1).max(2.25).nullable().optional(),
  azurowoscColorId: z.string().nullable().optional(),
  /** @deprecated Przeniesione do fenceStackVersionSchema.postHeightOffsetCm */
  postHeightCm: z.coerce.number().min(50).max(300).nullable().optional(),
  /** @deprecated Przeniesione do fenceStackVersionSchema.postHeightOffsetCm */
  postHeightOffsetCm: z.coerce.number().min(-150).max(150).nullable().optional(),
  heightIds: z.array(z.string()),
  sectionWidthCm: z.coerce.number().min(50).max(400).default(200),
  description: optionalString,
  sortOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const fenceBlockTextureSchema = z.object({
  blockId: z.string().min(1),
  colorId: z.string().min(1),
  imageUrl: z.union([z.string().url(), z.literal("")]).optional().default(""),
  priceNetPerUnit: z.coerce.number().min(0).default(0),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const loginSchema = z.object({
  email: z.string().email("Podaj poprawny adres e-mail"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});
