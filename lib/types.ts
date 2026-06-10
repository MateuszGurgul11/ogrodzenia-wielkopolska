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
};

export type Panel = CatalogEntity & {
  patternId: string;
};

export type SpacerOption = CatalogEntity & {
  hasSpacer: boolean;
  openness: number;
};

export type Height = {
  id: string;
  label: string;
  valueM: number;
  sortOrder: number;
  active: boolean;
};

export type Color = CatalogEntity & {
  hex: string;
};

export type CatalogCollections = {
  posts: Post[];
  panels: Panel[];
  spacerOptions: SpacerOption[];
  heights: Height[];
  colors: Color[];
};

export type ConfiguratorSelection = {
  postId: string | null;
  panelId: string | null;
  spacerId: string | null;
  heightId: string | null;
  colorId: string | null;
};

export const COLLECTION_NAMES = {
  posts: "posts",
  panels: "panels",
  spacerOptions: "spacerOptions",
  heights: "heights",
  colors: "colors",
} as const;

export type CollectionName = keyof typeof COLLECTION_NAMES;
