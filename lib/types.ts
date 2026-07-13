import type { PanelPresetKey } from "@/lib/fence/patterns";

export type CatalogEntity = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  description?: string;
  previewAsset?: string;
};

export type Post = CatalogEntity & {
  slug: string;
  widthCm: number;
  priceSurchargePerPanel?: number;
  priceSurchargePerMeter?: number;
  baseTextureUrl?: string;
};

/** Fizyczna płyta betonowa w pionowym stosie ogrodzenia. */
export type FenceBlock = {
  id: string;
  name: string;
  heightCm: number;
  role: "standard" | "cap";
  /** Proceduralny preset wyglądu (zastępuje wgrywane tekstury). */
  patternKey?: PanelPresetKey;
  supportsAzurowosc: boolean;
  sortOrder: number;
  active: boolean;
  description?: string;
  baseTextureUrl?: string;
  /** Własny markup SVG (pełny dokument lub fragment). Gdy ustawiony, zastępuje preset proceduralny. */
  svgMarkup?: string;
};

export type FenceStackSlot = {
  /** Stabilny identyfikator slotu (tylko UI, nie zapisywany w API). */
  uid?: string;
  blockId: string;
  mode: "repeat" | "once";
  gapCm?: number;
  /** Panel górny kopiuje blockId z paneli głównych (auto-sync przy zmianie głównego). */
  mirrorsMain?: boolean;
};

/** Wielokrotnego użytku preset przerw między płytami (ażurowość). */
export type AzurowoscPreset = {
  id: string;
  name: string;
  gapCm: number;
  sortOrder: number;
  active: boolean;
  description?: string;
};

/**
 * Jednostka w ręcznie zaprojektowanym układzie ażurowości (panel lub przerwa).
 * Kolejność w tablicy: od góry ogrodzenia do dołu (index 0 = góra).
 */
export type FenceAzurUnit = {
  blockId: string | null;
  isGap: boolean;
  heightCm: number;
};

/** Ręcznie dopracowany układ ażurowości dla konkretnej wysokości płotu. */
export type FenceAzurLayoutByHeight = {
  heightM: number;
  units: FenceAzurUnit[];
};

/** Opcja ażurowości dostępna dla wariantu (przerwa w cm + układy per wysokość). */
export type FenceAzurOption = {
  gapCm: number;
  /** Układy dostosowane ręcznie; brak wpisu = układ generowany automatycznie. */
  layouts: FenceAzurLayoutByHeight[];
};

/** Wersja układu paneli (A/B/C) w ramach jednego wariantu ogrodzenia. */
export type FenceStackVersion = {
  id: string;
  name: string;
  stack: FenceStackSlot[];
  azurowoscEnabled: boolean;
  azurowoscOptions?: FenceAzurOption[] | null;
  azurowoscColorId?: string | null;
  /** @deprecated Użyj postHeightOffsetCm. Całkowita wysokość słupka w cm. */
  postHeightCm?: number | null;
  /**
   * Różnica wysokości słupka względem nominalnej wysokości płotu (cm).
   * Ujemna = słupek niższy niż płot (np. -25 przy panelach z falą),
   * dodatnia = słupek wystaje ponad panele. Brak = auto.
   */
  postHeightOffsetCm?: number | null;
  sortOrder: number;
};

/** Wariant ogrodzenia wybierany przez klienta w konfiguratorze. */
export type FenceVariant = {
  id: string;
  name: string;
  postId: string;
  stack: FenceStackSlot[];
  /** Wersje układu paneli (A/B/C). Gdy brak — migracja ze starych pól stack/ażur. */
  stackVersions?: FenceStackVersion[] | null;
  /** Czy wariant oferuje klientowi ażurowość w konfiguratorze. */
  azurowoscEnabled: boolean;
  /** @deprecated Użyj azurowoscOptions */
  azurowoscPresetId?: string | null;
  /** Dostępne dla klienta ażurowości (w cm) wraz z układami. */
  azurowoscOptions?: FenceAzurOption[] | null;
  /** @deprecated Użyj azurowoscOptions — pojedynczy układ starego typu. */
  azurowoscLayout?: FenceAzurUnit[] | null;
  /** @deprecated Wysokość (m), dla której zaprojektowano azurowoscLayout. */
  azurowoscDesignHeightM?: number | null;
  /** Kolor użyty przy projektowaniu podglądu ażurowości. */
  azurowoscColorId?: string | null;
  /** @deprecated Użyj postHeightOffsetCm w FenceStackVersion. Całkowita wysokość słupka w cm. */
  postHeightCm?: number | null;
  /**
   * @deprecated Przeniesione na FenceStackVersion.postHeightOffsetCm (ustawiane per wariant paneli).
   * Różnica wysokości słupka względem nominalnej wysokości płotu (cm).
   */
  postHeightOffsetCm?: number | null;
  heightIds: string[];
  sectionWidthCm: number;
  sortOrder: number;
  active: boolean;
  description?: string;
};

/** @deprecated Użyj FenceBlock — zachowane dla migracji. */
export type Panel = CatalogEntity & {
  patternId: string;
  priceSurchargePerPanel?: number;
  priceSurchargePerMeter?: number;
  baseTextureUrl?: string;
  textureTileHeightM?: number;
};

export type SpacerOption = CatalogEntity & {
  hasSpacer: boolean;
  openness: number;
  priceSurchargePerPanel?: number;
  priceSurchargePerMeter?: number;
};

export type Height = {
  id: string;
  label: string;
  valueM: number;
  sortOrder: number;
  active: boolean;
  priceMultiplier?: number;
};

export type Color = CatalogEntity & {
  hex: string;
  priceSurchargePerPanel?: number;
  priceSurchargePerMeter?: number;
};

export type FeatureSettings = {
  bramaEnabled: boolean;
  furtkaEnabled: boolean;
};

export type OpeningElementType = "brama" | "furtka";

export type OpeningElement = {
  id: string;
  type: OpeningElementType;
  name: string;
  sortOrder: number;
  active: boolean;
  textureUrl?: string;
  description?: string;
  /** Brama: cena za panel/odcinek. Furtka: cena jednorazowa. */
  priceNet?: number;
};

export type FenceBlockTexture = {
  id: string;
  blockId: string;
  colorId: string;
  imageUrl: string;
  priceNetPerUnit: number;
  sortOrder?: number;
};

/** @deprecated Użyj FenceBlockTexture — zachowane dla migracji. */
export type PanelTexture = {
  id: string;
  panelId: string;
  colorId: string;
  imageUrl: string;
  sortOrder?: number;
};

export type PostTexture = {
  id: string;
  postId: string;
  colorId: string;
  imageUrl: string;
  priceNetPerPost: number;
  sortOrder?: number;
};

export type CatalogCollections = {
  posts: Post[];
  fenceBlocks: FenceBlock[];
  fenceVariants: FenceVariant[];
  fenceBlockTextures: FenceBlockTexture[];
  azurowoscPresets: AzurowoscPreset[];
  spacerOptions: SpacerOption[];
  heights: Height[];
  colors: Color[];
  elements: OpeningElement[];
  postTextures: PostTexture[];
  /** @deprecated */
  panels: Panel[];
  /** @deprecated */
  panelTextures: PanelTexture[];
};

export type ConfiguratorSelection = {
  postId: string | null;
  fenceVariantId: string | null;
  /** Aktywna wersja układu paneli (A/B/C) w wybranym wariancie. */
  stackVersionId: string | null;
  heightId: string | null;
  colorId: string | null;
  azurowoscEnabled: boolean;
  /** Wybrana przerwa ażurowości (cm) z azurowoscOptions aktywnej wersji. */
  azurowoscGapCm: number | null;
};

export const COLLECTION_NAMES = {
  posts: "posts",
  fenceBlocks: "fenceBlocks",
  fenceVariants: "fenceVariants",
  fenceBlockTextures: "fenceBlockTextures",
  azurowoscPresets: "azurowoscPresets",
  spacerOptions: "spacerOptions",
  heights: "heights",
  colors: "colors",
  elements: "elements",
  postTextures: "postTextures",
  panels: "panels",
  panelTextures: "panelTextures",
} as const;

export type CollectionName = keyof typeof COLLECTION_NAMES;

export type PricingSettings = {
  basePricePerMeterNet: number;
  panelPriceNet: number;
  panelWidthCm: number;
  currency: string;
};

export type QuoteBreakdown = {
  label: string;
  value: string;
  amount: number;
};

export type QuoteConfigurationItem = {
  label: string;
  value: string;
};

export type QuoteResult = {
  perimeterM: number;
  estimatedPanels: number;
  panelUnits: number;
  pricePerPanelNet: number;
  pricePerMeterNet: number;
  fenceSubtotal: number;
  postsSubtotal: number;
  bramaPrice: number;
  furtkaPrice: number;
  totalNet: number;
  currency: string;
  breakdown: QuoteBreakdown[];
  configurationItems: QuoteConfigurationItem[];
  hasMeasuredPerimeter: boolean;
};
