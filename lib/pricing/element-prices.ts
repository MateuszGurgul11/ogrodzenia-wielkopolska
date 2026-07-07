import type {
  CatalogCollections,
  OpeningElement,
  OpeningElementType,
} from "@/lib/types";

export const DEFAULT_BRAMA_PRICE_NET = 1800;
export const DEFAULT_FURTKA_PRICE_NET = 900;

const DEFAULTS: Record<OpeningElementType, number> = {
  brama: DEFAULT_BRAMA_PRICE_NET,
  furtka: DEFAULT_FURTKA_PRICE_NET,
};

export function getElementsByType(
  catalog: CatalogCollections,
  type: OpeningElementType,
  activeOnly = true,
): OpeningElement[] {
  return catalog.elements
    .filter((e) => e.type === type && (!activeOnly || e.active))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function pickDefaultElementId(
  catalog: CatalogCollections,
  type: OpeningElementType,
): string | null {
  return getElementsByType(catalog, type)[0]?.id ?? null;
}

export function resolveElement(
  catalog: CatalogCollections,
  type: OpeningElementType,
  elementId?: string | null,
): OpeningElement | undefined {
  if (elementId) {
    const found = catalog.elements.find((e) => e.id === elementId);
    if (found) return found;
  }
  return getElementsByType(catalog, type)[0];
}

export function resolveElementPriceNet(
  catalog: CatalogCollections,
  type: OpeningElementType,
  elementId?: string | null,
): number {
  const element = resolveElement(catalog, type, elementId);
  if (element?.priceNet != null && element.priceNet >= 0) {
    return element.priceNet;
  }
  return DEFAULTS[type];
}

export function formatElementPriceSubtitle(
  element: OpeningElement,
): string {
  const price = element.priceNet?.toLocaleString("pl-PL") ?? "—";
  if (element.type === "brama") {
    return `${price} PLN / panel`;
  }
  return `${price} PLN jednorazowo`;
}
