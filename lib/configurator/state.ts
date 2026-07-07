import { create } from "zustand";
import type {
  CatalogCollections,
  ConfiguratorSelection,
  FeatureSettings,
  PricingSettings,
} from "@/lib/types";
import {
  DEFAULT_BACKGROUND_PRESET_ID,
  type BackgroundPresetId,
} from "@/lib/configurator/backgrounds";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/api/client";
import { DEFAULT_PRICING_SETTINGS } from "@/lib/pricing/defaults";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import type { Line2D, Point2D } from "@/lib/pricing/geometry";
import { pickDefaultElementId } from "@/lib/pricing/element-prices";
import { getStackVersions } from "@/lib/fence/stackVersions";
import { arcSpanM } from "@/lib/pricing/perimeter-path";
import {
  defaultManualQuotePerimeterM,
  resolveQuotePerimeterM,
  type QuoteFenceScope,
} from "@/lib/pricing/quote-perimeter";

export { resolveQuotePerimeterM, type QuoteFenceScope } from "@/lib/pricing/quote-perimeter";

export type ConfiguratorTab =
  | "model"
  | "dimensions"
  | "gates"
  | "quote"
  | "review";

export type ProductScope = {
  fence: boolean;
  gate: boolean;
  wicket: boolean;
};

export type GatePosition = "left" | "center" | "right";
export type QuoteDrawMode = "calibrate" | "fence";

export const MIN_PREVIEW_PANELS = 3;
export const MAX_PREVIEW_PANELS = 12;
export const DEFAULT_PREVIEW_PANELS = 5;
export const DEFAULT_HEIGHT_M = 2;

function firstTabForScope(scope: ProductScope): ConfiguratorTab {
  if (scope.fence) return "model";
  if (scope.gate || scope.wicket) return "gates";
  return "quote";
}

export function getVisibleConfiguratorTabs(scope: ProductScope): ConfiguratorTab[] {
  const all: ConfiguratorTab[] = ["model", "dimensions", "gates", "quote", "review"];
  return all.filter((tab) => {
    if (tab === "model" || tab === "dimensions") return scope.fence;
    if (tab === "gates") return scope.gate || scope.wicket;
    return true;
  });
}

export function getNextConfiguratorTab(
  current: ConfiguratorTab,
  scope: ProductScope,
): ConfiguratorTab | null {
  const tabs = getVisibleConfiguratorTabs(scope);
  const i = tabs.indexOf(current);
  if (i < 0 || i >= tabs.length - 1) return null;
  return tabs[i + 1];
}

function pickDefaultHeightId(
  heights: CatalogCollections["heights"],
): string | null {
  const exact = heights.find((h) => h.valueM === DEFAULT_HEIGHT_M);
  if (exact) return exact.id;
  if (!heights.length) return null;
  return heights.reduce((best, h) =>
    Math.abs(h.valueM - DEFAULT_HEIGHT_M) <
    Math.abs(best.valueM - DEFAULT_HEIGHT_M)
      ? h
      : best,
  ).id;
}

export function getGatePanelIndex(
  position: GatePosition,
  panelCount: number,
): number {
  switch (position) {
    case "left":
      return 0;
    case "right":
      return Math.max(0, panelCount - 1);
    case "center":
      return Math.floor((panelCount - 1) / 2);
  }
}

type ConfiguratorState = {
  catalog: CatalogCollections | null;
  pricing: PricingSettings;
  features: FeatureSettings;
  loading: boolean;
  error: string | null;
  scope: ProductScope;
  scopeConfirmed: boolean;
  selection: ConfiguratorSelection;
  activeTab: ConfiguratorTab;
  backgroundImageUrl: string | null;
  backgroundPresetId: BackgroundPresetId;
  bramaEnabled: boolean;
  bramaElementId: string | null;
  bramaPosition: GatePosition;
  bramaArcStart: number | null;
  bramaArcEnd: number | null;
  bramaOccupiedSpanM: number | null;
  furtkaEnabled: boolean;
  furtkaElementId: string | null;
  furtkaPosition: GatePosition;
  furtkaArcPosition: number | null;
  previewPanelCount: number;
  sidebarOpen: boolean;
  quotePlanImageUrl: string | null;
  quoteDrawMode: QuoteDrawMode;
  quoteCalibrationLine: Line2D | null;
  quoteCalibrationLengthM: number;
  quoteCalibrationPending: Point2D | null;
  quoteFencePoints: Point2D[];
  quoteFenceClosed: boolean;
  quotePxPerMeter: number | null;
  quotePerimeterM: number | null;
  manualQuotePerimeterM: number;
  quoteFenceScope: QuoteFenceScope;
  manualQuoteFrontLengthM: number;
  quoteAdvancedView: boolean;
  setCatalog: (catalog: CatalogCollections) => void;
  setPricing: (pricing: PricingSettings) => void;
  setFeatures: (features: FeatureSettings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setScope: (partial: Partial<ProductScope>) => void;
  confirmScope: () => void;
  resetScope: () => void;
  initSelection: (catalog: CatalogCollections) => void;
  setSelection: (partial: Partial<ConfiguratorSelection>) => void;
  setActiveTab: (tab: ConfiguratorTab) => void;
  setBackgroundImage: (url: string) => void;
  setBackgroundPreset: (id: BackgroundPresetId) => void;
  clearBackgroundImage: () => void;
  setBramaEnabled: (enabled: boolean) => void;
  setBramaElementId: (elementId: string | null) => void;
  setBramaPosition: (position: GatePosition) => void;
  setBramaArcStart: (arcT: number | null) => void;
  setBramaArcEnd: (arcT: number | null) => void;
  setBramaOccupiedSpanM: (spanM: number | null) => void;
  setFurtkaEnabled: (enabled: boolean) => void;
  setFurtkaElementId: (elementId: string | null) => void;
  setFurtkaPosition: (position: GatePosition) => void;
  setFurtkaArcPosition: (arcT: number | null) => void;
  setPreviewPanelCount: (count: number) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarOpen: () => void;
  setQuotePlanImage: (url: string) => void;
  clearQuotePlanImage: () => void;
  setQuoteDrawMode: (mode: QuoteDrawMode) => void;
  setQuoteCalibrationLengthM: (lengthM: number) => void;
  setQuoteCalibrationLine: (line: Line2D | null) => void;
  setQuotePxPerMeter: (pxPerMeter: number | null) => void;
  setQuoteCalibrationPending: (point: Point2D | null) => void;
  addQuoteFencePoint: (point: Point2D) => void;
  undoQuoteFencePoint: () => void;
  removeQuoteFencePointAt: (index: number) => void;
  clearQuoteFence: () => void;
  closeQuoteFence: () => void;
  setQuotePerimeterM: (perimeterM: number | null) => void;
  setManualQuotePerimeterM: (perimeterM: number) => void;
  setQuoteFenceScope: (scope: QuoteFenceScope) => void;
  setManualQuoteFrontLengthM: (lengthM: number) => void;
  setQuoteAdvancedView: (open: boolean) => void;
  resetQuoteDrawing: () => void;
  applyQuoteToPreview: () => void;
};

const OPENING_CLEAR = {
  bramaArcStart: null,
  bramaArcEnd: null,
  bramaOccupiedSpanM: null,
  furtkaArcPosition: null,
} as const;

function recomputeBramaSpan(
  arcStart: number | null,
  arcEnd: number | null,
  perimeterM: number | null,
): number | null {
  if (arcStart == null || arcEnd == null || !perimeterM || perimeterM <= 0) {
    return null;
  }
  return arcSpanM(arcStart, arcEnd, perimeterM);
}

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  catalog: null,
  pricing: DEFAULT_PRICING_SETTINGS,
  features: DEFAULT_FEATURE_SETTINGS,
  loading: true,
  error: null,
  scope: { fence: false, gate: false, wicket: false },
  scopeConfirmed: false,
  selection: {
    postId: null,
    fenceVariantId: null,
    stackVersionId: null,
    heightId: null,
    colorId: null,
    azurowoscEnabled: false,
    azurowoscGapCm: null,
  },
  activeTab: "model",
  backgroundImageUrl: null,
  backgroundPresetId: DEFAULT_BACKGROUND_PRESET_ID,
  bramaEnabled: false,
  bramaElementId: null,
  bramaPosition: "left",
  bramaArcStart: null,
  bramaArcEnd: null,
  bramaOccupiedSpanM: null,
  furtkaEnabled: false,
  furtkaElementId: null,
  furtkaPosition: "right",
  furtkaArcPosition: null,
  previewPanelCount: DEFAULT_PREVIEW_PANELS,
  sidebarOpen: true,
  quotePlanImageUrl: null,
  quoteDrawMode: "calibrate",
  quoteCalibrationLine: null,
  quoteCalibrationLengthM: 10,
  quoteCalibrationPending: null,
  quoteFencePoints: [],
  quoteFenceClosed: false,
  quotePxPerMeter: null,
  quotePerimeterM: null,
  manualQuotePerimeterM: defaultManualQuotePerimeterM(
    DEFAULT_PRICING_SETTINGS.panelWidthCm,
  ),
  quoteFenceScope: "full-perimeter",
  manualQuoteFrontLengthM: defaultManualQuotePerimeterM(
    DEFAULT_PRICING_SETTINGS.panelWidthCm,
  ),
  quoteAdvancedView: false,
  setCatalog: (catalog) => set({ catalog }),
  setPricing: (pricing) =>
    set((s) => ({
      pricing,
      manualQuotePerimeterM:
        s.manualQuotePerimeterM > 0
          ? s.manualQuotePerimeterM
          : defaultManualQuotePerimeterM(pricing.panelWidthCm),
      manualQuoteFrontLengthM:
        s.manualQuoteFrontLengthM > 0
          ? s.manualQuoteFrontLengthM
          : defaultManualQuotePerimeterM(pricing.panelWidthCm),
    })),
  setFeatures: (features) => set({ features }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setScope: (partial) =>
    set((s) => ({ scope: { ...s.scope, ...partial } })),
  confirmScope: () => {
    const { scope, catalog } = get();
    if (!scope.fence && !scope.gate && !scope.wicket) return;

    const next: Partial<ConfiguratorState> = {
      scopeConfirmed: true,
      activeTab: firstTabForScope(scope),
      furtkaEnabled: scope.wicket,
    };

    if (scope.gate && catalog) {
      next.bramaElementId = pickDefaultElementId(catalog, "brama");
    } else {
      next.bramaElementId = null;
      next.bramaArcStart = null;
      next.bramaArcEnd = null;
      next.bramaOccupiedSpanM = null;
    }
    next.bramaEnabled = Boolean(next.bramaElementId);

    if (scope.wicket && catalog) {
      next.furtkaElementId = pickDefaultElementId(catalog, "furtka");
    } else {
      next.furtkaElementId = null;
      next.furtkaArcPosition = null;
    }

    const defaultManualPerimeter = defaultManualQuotePerimeterM(
      get().pricing.panelWidthCm,
    );
    next.manualQuotePerimeterM = defaultManualPerimeter;
    next.quoteFenceScope = "full-perimeter";
    next.manualQuoteFrontLengthM = defaultManualPerimeter;
    next.quoteAdvancedView = false;

    set(next);
  },
  resetScope: () =>
    set({
      scopeConfirmed: false,
      scope: { fence: false, gate: false, wicket: false },
      activeTab: "model",
      bramaEnabled: false,
      bramaElementId: null,
      furtkaEnabled: false,
      furtkaElementId: null,
      ...OPENING_CLEAR,
    }),
  initSelection: (catalog) => {
    const current = get().selection;
    const fenceVariantId =
      current.fenceVariantId ?? catalog.fenceVariants[0]?.id ?? null;
    const variant = catalog.fenceVariants.find((v) => v.id === fenceVariantId);
    const versions = variant ? getStackVersions(variant) : [];
    set({
      selection: {
        postId: current.postId ?? catalog.posts[0]?.id ?? null,
        fenceVariantId,
        stackVersionId:
          current.stackVersionId ?? versions[0]?.id ?? null,
        heightId: current.heightId ?? pickDefaultHeightId(catalog.heights),
        colorId: current.colorId ?? catalog.colors[0]?.id ?? null,
        azurowoscEnabled: current.azurowoscEnabled ?? false,
        azurowoscGapCm: current.azurowoscGapCm ?? null,
      },
    });
  },
  setSelection: (partial) =>
    set((s) => {
      const next = { ...s.selection, ...partial };
      if (
        partial.fenceVariantId !== undefined &&
        partial.fenceVariantId !== s.selection.fenceVariantId
      ) {
        const variant = s.catalog?.fenceVariants.find(
          (v) => v.id === partial.fenceVariantId,
        );
        const versions = variant ? getStackVersions(variant) : [];
        next.stackVersionId = versions[0]?.id ?? null;
        next.azurowoscEnabled = false;
        next.azurowoscGapCm = null;
      }
      if (
        partial.stackVersionId !== undefined &&
        partial.stackVersionId !== s.selection.stackVersionId
      ) {
        next.azurowoscEnabled = false;
        next.azurowoscGapCm = null;
      }
      return { selection: next };
    }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setBackgroundImage: (url) => {
    const prev = get().backgroundImageUrl;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({ backgroundImageUrl: url });
  },
  setBackgroundPreset: (id) => {
    const prev = get().backgroundImageUrl;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({ backgroundImageUrl: null, backgroundPresetId: id });
  },
  clearBackgroundImage: () => {
    const prev = get().backgroundImageUrl;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({ backgroundImageUrl: null });
  },
  setBramaEnabled: (enabled) =>
    set((s) => {
      if (!enabled) {
        return {
          bramaEnabled: false,
          bramaElementId: null,
          bramaArcStart: null,
          bramaArcEnd: null,
          bramaOccupiedSpanM: null,
        };
      }
      const bramaElementId =
        s.bramaElementId ??
        (s.catalog ? pickDefaultElementId(s.catalog, "brama") : null);
      if (!bramaElementId) {
        return { bramaEnabled: false, bramaElementId: null };
      }
      const bramaArcStart =
        s.bramaArcStart ?? (s.quoteFenceClosed ? 0.2 : null);
      const bramaArcEnd = s.bramaArcEnd ?? (s.quoteFenceClosed ? 0.3 : null);
      return {
        bramaEnabled: true,
        bramaElementId,
        bramaArcStart,
        bramaArcEnd,
        bramaOccupiedSpanM: recomputeBramaSpan(
          bramaArcStart,
          bramaArcEnd,
          s.quotePerimeterM,
        ),
      };
    }),
  setBramaElementId: (elementId) =>
    set((s) => {
      if (!elementId) {
        return {
          bramaEnabled: false,
          bramaElementId: null,
          bramaArcStart: null,
          bramaArcEnd: null,
          bramaOccupiedSpanM: null,
        };
      }
      const bramaArcStart =
        s.bramaArcStart ?? (s.quoteFenceClosed ? 0.2 : null);
      const bramaArcEnd = s.bramaArcEnd ?? (s.quoteFenceClosed ? 0.3 : null);
      return {
        bramaEnabled: true,
        bramaElementId: elementId,
        bramaArcStart,
        bramaArcEnd,
        bramaOccupiedSpanM: recomputeBramaSpan(
          bramaArcStart,
          bramaArcEnd,
          s.quotePerimeterM,
        ),
      };
    }),
  setBramaPosition: (position) => set({ bramaPosition: position }),
  setBramaArcStart: (arcT) =>
    set((s) => {
      const bramaArcStart = arcT;
      const bramaOccupiedSpanM = recomputeBramaSpan(
        bramaArcStart,
        s.bramaArcEnd,
        s.quotePerimeterM,
      );
      return { bramaArcStart, bramaOccupiedSpanM };
    }),
  setBramaArcEnd: (arcT) =>
    set((s) => {
      const bramaArcEnd = arcT;
      const bramaOccupiedSpanM = recomputeBramaSpan(
        s.bramaArcStart,
        bramaArcEnd,
        s.quotePerimeterM,
      );
      return { bramaArcEnd, bramaOccupiedSpanM };
    }),
  setBramaOccupiedSpanM: (spanM) => set({ bramaOccupiedSpanM: spanM }),
  setFurtkaEnabled: (enabled) =>
    set((s) => {
      if (!enabled) {
        return {
          furtkaEnabled: false,
          furtkaElementId: null,
          furtkaArcPosition: null,
        };
      }
      const furtkaElementId =
        s.furtkaElementId ??
        (s.catalog ? pickDefaultElementId(s.catalog, "furtka") : null);
      if (!furtkaElementId) {
        return { furtkaEnabled: false, furtkaElementId: null };
      }
      const furtkaArcPosition =
        s.furtkaArcPosition ?? (s.quoteFenceClosed ? 0.7 : null);
      return { furtkaEnabled: true, furtkaElementId, furtkaArcPosition };
    }),
  setFurtkaElementId: (elementId) =>
    set((s) => {
      if (!elementId) {
        return {
          furtkaEnabled: false,
          furtkaElementId: null,
          furtkaArcPosition: null,
        };
      }
      const furtkaArcPosition =
        s.furtkaArcPosition ?? (s.quoteFenceClosed ? 0.7 : null);
      return {
        furtkaEnabled: true,
        furtkaElementId: elementId,
        furtkaArcPosition,
      };
    }),
  setFurtkaPosition: (position) => set({ furtkaPosition: position }),
  setFurtkaArcPosition: (arcT) => set({ furtkaArcPosition: arcT }),
  setPreviewPanelCount: (count) =>
    set({
      previewPanelCount: Math.min(
        MAX_PREVIEW_PANELS,
        Math.max(MIN_PREVIEW_PANELS, count),
      ),
    }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarOpen: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setQuotePlanImage: (url) => {
    const prev = get().quotePlanImageUrl;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({
      quotePlanImageUrl: url,
      quoteCalibrationLine: null,
      quoteCalibrationPending: null,
      quoteFencePoints: [],
      quoteFenceClosed: false,
      quotePxPerMeter: null,
      quotePerimeterM: null,
      quoteDrawMode: "calibrate",
      ...OPENING_CLEAR,
    });
  },
  clearQuotePlanImage: () => {
    const prev = get().quotePlanImageUrl;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({
      quotePlanImageUrl: null,
      quoteCalibrationLine: null,
      quoteCalibrationPending: null,
      quoteFencePoints: [],
      quoteFenceClosed: false,
      quotePxPerMeter: null,
      quotePerimeterM: null,
      quoteDrawMode: "calibrate",
      ...OPENING_CLEAR,
    });
  },
  setQuoteDrawMode: (mode) => set({ quoteDrawMode: mode }),
  setQuoteCalibrationLengthM: (lengthM) =>
    set({ quoteCalibrationLengthM: lengthM }),
  setQuoteCalibrationLine: (line) => {
    set({ quoteCalibrationLine: line });
    if (!line) {
      set({ quotePxPerMeter: null, quotePerimeterM: null });
    }
  },
  setQuotePxPerMeter: (pxPerMeter) => set({ quotePxPerMeter: pxPerMeter }),
  setQuoteCalibrationPending: (point) =>
    set({ quoteCalibrationPending: point }),
  addQuoteFencePoint: (point) =>
    set((s) => ({
      quoteFencePoints: s.quoteFenceClosed
        ? [point]
        : [...s.quoteFencePoints, point],
      quoteFenceClosed: false,
      quotePerimeterM: null,
      ...OPENING_CLEAR,
    })),
  undoQuoteFencePoint: () =>
    set((s) => ({
      quoteFencePoints: s.quoteFencePoints.slice(0, -1),
      quoteFenceClosed: false,
      quotePerimeterM: null,
      ...OPENING_CLEAR,
    })),
  removeQuoteFencePointAt: (index) =>
    set((s) => {
      if (index < 0 || index >= s.quoteFencePoints.length) return s;
      return {
        quoteFencePoints: s.quoteFencePoints.filter((_, i) => i !== index),
        quoteFenceClosed: false,
        quotePerimeterM: null,
        ...OPENING_CLEAR,
      };
    }),
  clearQuoteFence: () =>
    set({
      quoteFencePoints: [],
      quoteFenceClosed: false,
      quotePerimeterM: null,
      ...OPENING_CLEAR,
    }),
  closeQuoteFence: () =>
    set((s) => {
      const next: Partial<ConfiguratorState> = { quoteFenceClosed: true };
      if (s.bramaEnabled && s.bramaArcStart == null) {
        next.bramaArcStart = 0.2;
        next.bramaArcEnd = 0.3;
        next.bramaOccupiedSpanM = recomputeBramaSpan(
          0.2,
          0.3,
          s.quotePerimeterM,
        );
      }
      if (s.furtkaEnabled && s.furtkaArcPosition == null) {
        next.furtkaArcPosition = 0.7;
      }
      return next;
    }),
  setQuotePerimeterM: (perimeterM) =>
    set((s) => ({
      quotePerimeterM: perimeterM,
      bramaOccupiedSpanM: recomputeBramaSpan(
        s.bramaArcStart,
        s.bramaArcEnd,
        perimeterM,
      ),
    })),
  setManualQuotePerimeterM: (perimeterM) =>
    set({ manualQuotePerimeterM: perimeterM }),
  setQuoteFenceScope: (scope) => set({ quoteFenceScope: scope }),
  setManualQuoteFrontLengthM: (lengthM) =>
    set({ manualQuoteFrontLengthM: lengthM }),
  setQuoteAdvancedView: (open) => set({ quoteAdvancedView: open }),
  resetQuoteDrawing: () =>
    set({
      quoteCalibrationLine: null,
      quoteCalibrationPending: null,
      quoteFencePoints: [],
      quoteFenceClosed: false,
      quotePxPerMeter: null,
      quotePerimeterM: null,
      quoteDrawMode: "calibrate",
      ...OPENING_CLEAR,
    }),
  applyQuoteToPreview: () => {
    const state = get();
    const effectivePerimeterM = resolveQuotePerimeterM({
      quoteFenceClosed: state.quoteFenceClosed,
      quotePerimeterM: state.quotePerimeterM,
      quoteFenceScope: state.quoteFenceScope,
      manualQuotePerimeterM: state.manualQuotePerimeterM,
      manualQuoteFrontLengthM: state.manualQuoteFrontLengthM,
    });
    if (!effectivePerimeterM || effectivePerimeterM <= 0 || !state.catalog) return;

    const quote = calculateQuote({
      catalog: state.catalog,
      selection: state.selection,
      pricing: state.pricing,
      perimeterM: effectivePerimeterM,
      fenceEnabled: state.scope.fence,
      bramaEnabled: state.bramaEnabled,
      bramaElementId: state.bramaElementId,
      bramaOccupiedSpanM: state.bramaOccupiedSpanM,
      furtkaEnabled: state.furtkaEnabled,
      furtkaElementId: state.furtkaElementId,
      fallbackPanelCount: state.previewPanelCount,
    });

    const panels = Math.min(
      MAX_PREVIEW_PANELS,
      Math.max(MIN_PREVIEW_PANELS, quote.estimatedPanels),
    );
    set({ previewPanelCount: panels });
  },
}));
