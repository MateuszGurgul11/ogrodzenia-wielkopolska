export type ParsedSvg = {
  viewBox: string;
  content: string;
};

const DEFAULT_VIEWBOX = "0 0 100 100";

/** Usuwa niebezpieczne elementy i atrybuty z markupu SVG. */
export function sanitizeSvgMarkup(raw: string): string {
  let svg = raw.trim();
  if (!svg) return "";

  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  svg = svg.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  svg = svg.replace(/javascript:/gi, "");
  svg = svg.replace(/xlink:href\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, "");

  return svg;
}

/** Wyciąga viewBox i wewnętrzną treść z pełnego SVG lub fragmentu. */
export function extractSvgInner(raw: string): ParsedSvg {
  const sanitized = sanitizeSvgMarkup(raw);
  if (!sanitized) {
    return { viewBox: DEFAULT_VIEWBOX, content: "" };
  }

  const svgMatch = sanitized.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/i);
  if (!svgMatch) {
    return { viewBox: DEFAULT_VIEWBOX, content: sanitized };
  }

  const attrs = svgMatch[1] ?? "";
  const content = svgMatch[2]?.trim() ?? "";
  const viewBoxMatch = attrs.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (viewBoxMatch?.[1]) {
    return { viewBox: viewBoxMatch[1], content };
  }

  const widthMatch = attrs.match(/width\s*=\s*"([\d.]+)/i);
  const heightMatch = attrs.match(/height\s*=\s*"([\d.]+)/i);
  if (widthMatch?.[1] && heightMatch?.[1]) {
    return {
      viewBox: `0 0 ${widthMatch[1]} ${heightMatch[1]}`,
      content,
    };
  }

  return { viewBox: DEFAULT_VIEWBOX, content };
}

function parseViewBox(viewBox: string): { x: number; y: number; w: number; h: number } {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (
    parts.length === 4 &&
    parts.every((n) => Number.isFinite(n)) &&
    parts[2] > 0 &&
    parts[3] > 0
  ) {
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  }
  return { x: 0, y: 0, w: 100, h: 100 };
}

/** Skaluje zawartość SVG do prostokąta panelu w scenie ogrodzenia. */
export function wrapCustomSvgForPanel(
  rawMarkup: string,
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const { viewBox, content } = extractSvgInner(rawMarkup);
  if (!content) return "";

  const vb = parseViewBox(viewBox);
  // Rozciągnięcie do pełnego prostokąta płyty — wysokości bloków w stosie są
  // różne, więc dopasowanie "meet" zostawiałoby puste pasy przy fudze.
  const sx = w / vb.w;
  const sy = h / vb.h;
  const tx = x - vb.x * sx;
  const ty = y - vb.y * sy;
  const clipId = `csvg${x.toFixed(0)}x${y.toFixed(0)}`;

  return (
    `<clipPath id="${clipId}"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}"/></clipPath>` +
    `<g clip-path="url(#${clipId})"><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})">${content}</g></g>`
  );
}

/** Pełny SVG do podglądu w galerii (jeden panel, przycięty viewBox). */
export function buildCustomSvgPreview(
  rawMarkup: string,
  width = 280,
  height = 180,
): string {
  const { viewBox, content } = extractSvgInner(rawMarkup);
  if (!content) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%"><text x="50%" y="50%" text-anchor="middle" fill="#9ca3af" font-size="12">Brak treści SVG</text></svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${content}</svg>`;
}
