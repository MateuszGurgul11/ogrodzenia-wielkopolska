export type PatternId =
  | "pattern-solid"
  | "pattern-lines"
  | "pattern-grid"
  | "pattern-brick";

export const PATTERN_OPTIONS: { id: PatternId; label: string }[] = [
  { id: "pattern-solid", label: "Gładki" },
  { id: "pattern-lines", label: "Pionowe linie" },
  { id: "pattern-grid", label: "Siatka" },
  { id: "pattern-brick", label: "Cegiełka" },
];

/** Klucze proceduralnych presetów wyglądu płyt betonowych. */
export const PANEL_PRESET_KEYS = [
  "concrete-standard",
  "concrete-arch",
  "tile-offset",
  "stone-split",
  "brick-small",
  "sandstone",
  "sandstone-arch",
  "clapboard-wide",
  "wave-dunes",
  "concrete-smooth",
  "shards",
  "wave-crest-weave",
  "slot-top",
  "arch-rails",
] as const;

/** Proceduralny preset wyglądu płyty betonowej. */
export type PanelPresetKey = (typeof PANEL_PRESET_KEYS)[number];

export const PANEL_PRESETS: {
  key: PanelPresetKey;
  label: string;
  role: "standard" | "cap";
}[] = [
  {
    key: "concrete-standard",
    label: "Beton falowany — panel główny",
    role: "standard",
  },
  {
    key: "concrete-arch",
    label: "Beton falowany — panel górny (łuk)",
    role: "cap",
  },
  { key: "tile-offset", label: "Cegiełki przesuwane", role: "standard" },
  { key: "stone-split", label: "Mur", role: "standard" },
  { key: "brick-small", label: "Cegiełka", role: "standard" },
  { key: "sandstone", label: "Piaskowiec", role: "standard" },
  { key: "sandstone-arch", label: "Piaskowiec łuk", role: "cap" },
  { key: "clapboard-wide", label: "Deska pozioma — szeroka", role: "standard" },
  { key: "wave-dunes", label: "Fala piaskowa 3D", role: "standard" },
  {
    key: "concrete-smooth",
    label: "Beton architektoniczny — gładki",
    role: "standard",
  },
  { key: "shards", label: "Diamenty — łamane fasety", role: "standard" },
  {
    key: "wave-crest-weave",
    label: "Fala przeplatana — panel górny",
    role: "cap",
  },
  {
    key: "slot-top",
    label: "Belki z prześwitami — panel górny (prosty)",
    role: "cap",
  },
  {
    key: "arch-rails",
    label: "Łuk z belkami — panel górny",
    role: "cap",
  },
];

export function presetRoleFromKey(
  key: PanelPresetKey | undefined,
): "standard" | "cap" {
  return PANEL_PRESETS.find((p) => p.key === key)?.role ?? "standard";
}

export function presetsForRole(role: "standard" | "cap") {
  return PANEL_PRESETS.filter((p) => p.role === role);
}

export function defaultPresetKeyForRole(
  role: "standard" | "cap",
): PanelPresetKey {
  const first = presetsForRole(role)[0]?.key;
  return first ?? (role === "cap" ? "concrete-arch" : "concrete-standard");
}

export function isArchPanel(
  patternKey?: PanelPresetKey,
  role?: "standard" | "cap",
): boolean {
  if (patternKey === "concrete-arch") return true;
  if (patternKey === "sandstone-arch") return true;
  if (patternKey === "concrete-standard") return false;
  return role === "cap";
}
