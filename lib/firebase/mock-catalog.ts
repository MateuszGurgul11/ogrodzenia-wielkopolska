import type { CatalogCollections } from "@/lib/types";

/** Dane demo gdy Firebase nie jest skonfigurowany (dev bez .env.local). */
export const MOCK_CATALOG: CatalogCollections = {
  posts: [
    {
      id: "post-1",
      name: "Słupek standard",
      slug: "standard",
      widthCm: 20,
      sortOrder: 0,
      active: true,
    },
    {
      id: "post-2",
      name: "Słupek dekoracyjny",
      slug: "dekor",
      widthCm: 25,
      sortOrder: 1,
      active: true,
    },
  ],
  panels: [
    {
      id: "panel-1",
      name: "Gładki",
      patternId: "pattern-solid",
      sortOrder: 0,
      active: true,
    },
    {
      id: "panel-2",
      name: "Pionowe linie",
      patternId: "pattern-lines",
      sortOrder: 1,
      active: true,
    },
    {
      id: "panel-3",
      name: "Siatka",
      patternId: "pattern-grid",
      sortOrder: 2,
      active: true,
    },
    {
      id: "panel-4",
      name: "Cegiełka",
      patternId: "pattern-brick",
      sortOrder: 3,
      active: true,
    },
  ],
  spacerOptions: [
    {
      id: "spacer-1",
      name: "Bez dystansu (pełne)",
      hasSpacer: false,
      openness: 0,
      sortOrder: 0,
      active: true,
    },
    {
      id: "spacer-2",
      name: "Z dystansem (ażurowe)",
      hasSpacer: true,
      openness: 0.35,
      sortOrder: 1,
      active: true,
    },
  ],
  heights: [
    { id: "h-1", label: "1,00 m", valueM: 1.0, sortOrder: 0, active: true },
    { id: "h-2", label: "1,50 m", valueM: 1.5, sortOrder: 1, active: true },
    { id: "h-3", label: "1,75 m", valueM: 1.75, sortOrder: 2, active: true },
    { id: "h-4", label: "2,00 m", valueM: 2.0, sortOrder: 3, active: true },
    { id: "h-5", label: "2,25 m", valueM: 2.25, sortOrder: 4, active: true },
  ],
  colors: [
    { id: "c-1", name: "Szary naturalny", hex: "#9ca3af", sortOrder: 0, active: true },
    { id: "c-2", name: "Antracyt", hex: "#374151", sortOrder: 1, active: true },
    { id: "c-3", name: "Biały", hex: "#f3f4f6", sortOrder: 2, active: true },
    { id: "c-4", name: "Piaskowy", hex: "#d6c4a8", sortOrder: 3, active: true },
    { id: "c-5", name: "Grafit", hex: "#4b5563", sortOrder: 4, active: true },
    { id: "c-6", name: "Czerwony cegła", hex: "#b45309", sortOrder: 5, active: true },
  ],
};
