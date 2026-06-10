import { create } from "zustand";
import type { CatalogCollections, ConfiguratorSelection } from "@/lib/types";

export type ConfiguratorTab =
  | "model"
  | "dimensions"
  | "gates"
  | "review";

export type GatePosition = "left" | "center" | "right";

export const MIN_PREVIEW_PANELS = 3;
export const MAX_PREVIEW_PANELS = 12;
export const DEFAULT_PREVIEW_PANELS = 5;
export const DEFAULT_HEIGHT_M = 2;

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
  loading: boolean;
  error: string | null;
  selection: ConfiguratorSelection;
  activeTab: ConfiguratorTab;
  backgroundImageUrl: string | null;
  gateEnabled: boolean;
  gatePosition: GatePosition;
  previewPanelCount: number;
  sidebarOpen: boolean;
  setCatalog: (catalog: CatalogCollections) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initSelection: (catalog: CatalogCollections) => void;
  setSelection: (partial: Partial<ConfiguratorSelection>) => void;
  setActiveTab: (tab: ConfiguratorTab) => void;
  setBackgroundImage: (url: string) => void;
  clearBackgroundImage: () => void;
  setGateEnabled: (enabled: boolean) => void;
  setGatePosition: (position: GatePosition) => void;
  setPreviewPanelCount: (count: number) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarOpen: () => void;
};

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  catalog: null,
  loading: true,
  error: null,
  selection: {
    postId: null,
    panelId: null,
    spacerId: null,
    heightId: null,
    colorId: null,
  },
  activeTab: "model",
  backgroundImageUrl: null,
  gateEnabled: false,
  gatePosition: "center",
  previewPanelCount: DEFAULT_PREVIEW_PANELS,
  sidebarOpen: true,
  setCatalog: (catalog) => set({ catalog }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  initSelection: (catalog) => {
    const current = get().selection;
    set({
      selection: {
        postId: current.postId ?? catalog.posts[0]?.id ?? null,
        panelId: current.panelId ?? catalog.panels[0]?.id ?? null,
        spacerId: current.spacerId ?? catalog.spacerOptions[0]?.id ?? null,
        heightId: current.heightId ?? pickDefaultHeightId(catalog.heights),
        colorId: current.colorId ?? catalog.colors[0]?.id ?? null,
      },
    });
  },
  setSelection: (partial) =>
    set((s) => ({ selection: { ...s.selection, ...partial } })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setBackgroundImage: (url) => {
    const prev = get().backgroundImageUrl;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({ backgroundImageUrl: url });
  },
  clearBackgroundImage: () => {
    const prev = get().backgroundImageUrl;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({ backgroundImageUrl: null });
  },
  setGateEnabled: (enabled) => set({ gateEnabled: enabled }),
  setGatePosition: (position) => set({ gatePosition: position }),
  setPreviewPanelCount: (count) =>
    set({
      previewPanelCount: Math.min(
        MAX_PREVIEW_PANELS,
        Math.max(MIN_PREVIEW_PANELS, count),
      ),
    }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarOpen: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
