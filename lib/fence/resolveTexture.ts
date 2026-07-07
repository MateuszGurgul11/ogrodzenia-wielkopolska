import type { CatalogCollections } from "@/lib/types";

export const DEFAULT_TEXTURE_TILE_HEIGHT_M = 0.45;

export function computeTextureTileCount(
  heightM: number,
  tileHeightM?: number | null,
): number {
  const tile = tileHeightM && tileHeightM > 0 ? tileHeightM : DEFAULT_TEXTURE_TILE_HEIGHT_M;
  return Math.max(1, Math.round(heightM / tile));
}

export function resolvePanelTextureUrl(
  catalog: CatalogCollections,
  panelId: string | null,
  colorId: string | null,
): string | null {
  if (!panelId) return null;
  const panel = catalog.panels.find((p) => p.id === panelId);
  if (colorId) {
    const match = catalog.panelTextures.find(
      (t) => t.panelId === panelId && t.colorId === colorId,
    );
    if (match?.imageUrl) return match.imageUrl;
  }
  return panel?.baseTextureUrl ?? null;
}

export function resolvePostTextureUrl(
  catalog: CatalogCollections,
  postId: string | null,
  colorId: string | null,
): string | null {
  if (!postId) return null;
  const post = catalog.posts.find((p) => p.id === postId);
  if (colorId) {
    const match = catalog.postTextures.find(
      (t) => t.postId === postId && t.colorId === colorId,
    );
    if (match?.imageUrl) return match.imageUrl;
  }
  return post?.baseTextureUrl ?? null;
}

export function resolveOpeningTextureUrl(
  catalog: CatalogCollections,
  type: "brama" | "furtka",
  elementId?: string | null,
): string | null {
  if (elementId) {
    const selected = catalog.elements.find((e) => e.id === elementId);
    if (selected?.textureUrl) return selected.textureUrl;
  }
  const element = catalog.elements.find((e) => e.type === type && e.active);
  return element?.textureUrl ?? null;
}

export function resolvePanelTileHeightM(
  catalog: CatalogCollections,
  panelId: string | null,
): number {
  if (!panelId) return DEFAULT_TEXTURE_TILE_HEIGHT_M;
  const panel = catalog.panels.find((p) => p.id === panelId);
  return panel?.textureTileHeightM ?? DEFAULT_TEXTURE_TILE_HEIGHT_M;
}
