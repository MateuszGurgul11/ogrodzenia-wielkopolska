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
