import type { PanelPresetKey, PatternId } from "./patterns";
import { isArchPanel } from "./patterns";
import { wrapCustomSvgForPanel } from "./sanitizeSvg";

export type StackDrawUnit = {
  textureUrl?: string | null;
  heightCm: number;
  gapAfterCm: number;
  isGap?: boolean;
  role?: "standard" | "cap";
  patternKey?: PanelPresetKey;
  svgMarkup?: string | null;
  seed?: number;
};

export type FenceRenderParams = {
  heightM: number;
  patternId: PatternId;
  colorHex: string;
  postWidthCm: number;
  panelCount?: number;
  openingPanelIndices?: number[];
  /** Bez tła nieba/trawy — do podglądu na ciemnym tle sceny */
  transparent?: boolean;
  panelTextureUrl?: string | null;
  postTextureUrl?: string | null;
  openingTextureUrl?: string | null;
  textureTileCount?: number;
  /** Pionowy stos płyt — gdy podany, zastępuje kafelkowanie jednej tekstury */
  stackUnits?: StackDrawUnit[];
  /** @deprecated Używane tylko gdy brak stackUnits (bramy/furtka) */
  hasSpacer?: boolean;
  /** @deprecated */
  openness?: number;
  /** Całkowita wysokość słupka w cm (wizualna). Brak = auto (fenceY - 12). */
  postHeightCm?: number;
};

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function drawTexturedStack(
  px: number,
  py: number,
  w: number,
  h: number,
  url: string,
  tileCount: number,
): string {
  const safeUrl = escapeXmlAttr(url);
  const tiles = Math.max(1, tileCount);
  const tileH = h / tiles;
  let out = "";
  for (let i = 0; i < tiles; i++) {
    out += `<image href="${safeUrl}" x="${px.toFixed(1)}" y="${(py + i * tileH).toFixed(1)}" width="${w.toFixed(1)}" height="${tileH.toFixed(1)}" preserveAspectRatio="none"/>`;
  }
  return out;
}

export const BASE_HEIGHT_M = 2.25;
export const VIEW_W = 900;
export const VIEW_H = 440;
const MARGIN_X = 80;
const SECTION_WIDTH = 230;

export function getViewWidth(panelCount: number): number {
  return MARGIN_X * 2 + panelCount * SECTION_WIDTH;
}

type FenceGeometry = {
  viewW: number;
  groundY: number;
  fenceH: number;
  fenceY: number;
  postW: number;
  postTopY: number;
  postH: number;
  leftPost: number;
  rightPost: number;
  fenceCenterX: number;
  totalW: number;
  panelCount: number;
};

function postHeightCmToPx(postHeightCm: number): number {
  return Math.round((postHeightCm / 100 / BASE_HEIGHT_M) * 240);
}

function computeFenceGeometry(
  heightM: number,
  postWidthCm: number,
  panelCount = 3,
  postHeightCm?: number,
): FenceGeometry {
  const scale = heightM / BASE_HEIGHT_M;
  const groundY = 330;
  const fenceH = Math.round(240 * scale);
  const fenceY = groundY - fenceH;
  const postW = Math.max(18, Math.round((postWidthCm / 20) * 24));
  const postTopY = postHeightCm
    ? groundY - postHeightCmToPx(postHeightCm)
    : fenceY - 12;
  const postH = groundY - postTopY;
  const viewW = getViewWidth(panelCount);
  const totalW = viewW - MARGIN_X * 2;
  const leftPost = MARGIN_X;
  const rightPost = MARGIN_X + totalW - postW;
  const fenceCenterX = MARGIN_X + totalW / 2;

  return {
    viewW,
    groundY,
    fenceH,
    fenceY,
    postW,
    postTopY,
    postH,
    leftPost,
    rightPost,
    fenceCenterX,
    totalW,
    panelCount,
  };
}

export type FenceAnchor = {
  x: number;
  y: number;
  labelSide: "left" | "right" | "top" | "bottom";
};

export type FenceAnchorPoints = {
  height: FenceAnchor;
  length: FenceAnchor;
  material: FenceAnchor;
  color: FenceAnchor;
};

type PlankLayout = {
  useStacked: boolean;
  plankCount: number;
  slitGap: number;
  plankH: number;
};

function computePlankLayout(
  fenceH: number,
  hasSpacer: boolean,
  openness: number,
): PlankLayout {
  const useStacked = hasSpacer && openness > 0;
  const plankCount = useStacked
    ? Math.min(8, Math.max(4, Math.round(fenceH / 42)))
    : 1;
  const slitGap = useStacked ? 3 + openness * 10 : 0;
  const plankH = (fenceH - slitGap * (plankCount - 1)) / plankCount;
  return { useStacked, plankCount, slitGap, plankH };
}

export function getFenceAnchorPoints(params: {
  heightM: number;
  postWidthCm: number;
  hasSpacer?: boolean;
  openness?: number;
}): FenceAnchorPoints {
  const { groundY, fenceH, fenceY, postW, leftPost, rightPost, fenceCenterX } =
    computeFenceGeometry(params.heightM, params.postWidthCm);
  const { plankH } = computePlankLayout(
    fenceH,
    params.hasSpacer ?? false,
    params.openness ?? 0,
  );

  return {
    height: {
      x: leftPost + postW / 2,
      y: fenceY + fenceH / 2,
      labelSide: "left",
    },
    length: { x: fenceCenterX, y: groundY - 4, labelSide: "bottom" },
    material: {
      x: fenceCenterX,
      y: fenceY + plankH / 2,
      labelSide: "top",
    },
    color: {
      x: rightPost + postW / 2,
      y: fenceY + fenceH / 2,
      labelSide: "right",
    },
  };
}

export type FenceContentBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getFenceContentBounds(params: {
  heightM: number;
  postWidthCm: number;
  panelCount?: number;
  postHeightCm?: number;
}): FenceContentBounds {
  const { groundY, postW, leftPost, rightPost, postTopY, fenceY } =
    computeFenceGeometry(
      params.heightM,
      params.postWidthCm,
      params.panelCount ?? 3,
      params.postHeightCm,
    );
  // Kadr od wyższego z elementów: słupek może być niższy niż panele
  // (np. panele z falą) — wtedy góra kadru to szczyt paneli, nie słupka.
  const contentTop = Math.min(postTopY, fenceY) - 4;
  const footingBottom = groundY + 6;

  return {
    x: leftPost - 6,
    y: contentTop,
    width: rightPost + postW - leftPost + 12,
    height: footingBottom - contentTop,
  };
}

export function anchorToPercent(anchor: FenceAnchor): { left: string; top: string } {
  return {
    left: `${(anchor.x / VIEW_W) * 100}%`,
    top: `${(anchor.y / VIEW_H) * 100}%`,
  };
}

export function anchorToBoundsPercent(
  anchor: FenceAnchor,
  bounds: FenceContentBounds,
): { left: string; top: string } {
  return {
    left: `${((anchor.x - bounds.x) / bounds.width) * 100}%`,
    top: `${((anchor.y - bounds.y) / bounds.height) * 100}%`,
  };
}

function darken(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  const r = Math.max(0, Math.round(parseInt(n.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(n.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(n.slice(4, 6), 16) * (1 - amount)));
  return `rgb(${r},${g},${b})`;
}

function lighten(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  const r = Math.min(255, Math.round(parseInt(n.slice(0, 2), 16) + amount * 255));
  const g = Math.min(255, Math.round(parseInt(n.slice(2, 4), 16) + amount * 255));
  const b = Math.min(255, Math.round(parseInt(n.slice(4, 6), 16) + amount * 255));
  return `rgb(${r},${g},${b})`;
}

function panelPatternDefs(patternId: PatternId, colorHex: string): string {
  const stroke = darken(colorHex, 0.25);
  const highlight = lighten(colorHex, 0.08);
  switch (patternId) {
    case "pattern-lines":
      return `<pattern id="panelPat" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="${colorHex}"/>
        <rect x="0" y="0" width="5" height="16" fill="${highlight}" opacity="0.6"/>
        <rect x="8" y="0" width="5" height="16" fill="${highlight}" opacity="0.6"/>
        <line x1="5" y1="0" x2="5" y2="16" stroke="${stroke}" stroke-width="1.2"/>
        <line x1="13" y1="0" x2="13" y2="16" stroke="${stroke}" stroke-width="0.8"/>
      </pattern>`;
    case "pattern-grid":
      return `<pattern id="panelPat" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="${colorHex}"/>
        <rect x="1" y="1" width="6" height="6" fill="${highlight}" opacity="0.5"/>
        <rect x="9" y="1" width="6" height="6" fill="${highlight}" opacity="0.5"/>
        <rect x="1" y="9" width="6" height="6" fill="${highlight}" opacity="0.5"/>
        <rect x="9" y="9" width="6" height="6" fill="${highlight}" opacity="0.5"/>
        <path d="M0 0H16V16H0V0M0 8H16M8 0V16" fill="none" stroke="${stroke}" stroke-width="1"/>
      </pattern>`;
    case "pattern-brick":
      return `<pattern id="panelPat" width="24" height="12" patternUnits="userSpaceOnUse">
        <rect width="24" height="12" fill="${colorHex}"/>
        <rect x="0.5" y="0.5" width="11" height="5" fill="${highlight}" opacity="0.4"/>
        <rect x="13.5" y="0.5" width="9.5" height="5" fill="${highlight}" opacity="0.4"/>
        <rect x="0.5" y="6.5" width="5" height="5" fill="${highlight}" opacity="0.4"/>
        <rect x="7.5" y="6.5" width="11" height="5" fill="${highlight}" opacity="0.4"/>
        <path d="M0 6H24M12 0V6M0 0V12M6 6V12M18 6V12" fill="none" stroke="${stroke}" stroke-width="0.8"/>
      </pattern>`;
    default:
      return `<pattern id="panelPat" width="18" height="18" patternUnits="userSpaceOnUse">
        <rect width="18" height="18" fill="${colorHex}"/>
        <line x1="0" y1="18" x2="18" y2="0" stroke="${darken(colorHex, 0.07)}" stroke-width="1.5" opacity="0.35"/>
        <line x1="-9" y1="18" x2="9" y2="0" stroke="${darken(colorHex, 0.07)}" stroke-width="1.5" opacity="0.35"/>
        <line x1="9" y1="18" x2="27" y2="0" stroke="${darken(colorHex, 0.07)}" stroke-width="1.5" opacity="0.35"/>
      </pattern>`;
  }
}

function drawPlank(
  px: number,
  py: number,
  panelW: number,
  plankH: number,
  shadowEdge: string,
  shadowBottom: string,
  panelTextureUrl?: string | null,
  textureTileCount?: number,
): string {
  let out = "";
  if (panelTextureUrl) {
    out += drawTexturedStack(
      px,
      py,
      panelW,
      plankH,
      panelTextureUrl,
      textureTileCount ?? 1,
    );
  } else {
    out += `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${panelW.toFixed(1)}" height="${plankH.toFixed(1)}" fill="url(#panelPat)" rx="2"/>`;
  }
  out += `<rect x="${(px + panelW - 2).toFixed(1)}" y="${py.toFixed(1)}" width="2" height="${plankH.toFixed(1)}" fill="${shadowEdge}" opacity="0.6"/>`;
  if (plankH > 4) {
    out += `<rect x="${px.toFixed(1)}" y="${(py + plankH - 3).toFixed(1)}" width="${panelW.toFixed(1)}" height="3" fill="${shadowBottom}" opacity="0.5"/>`;
  }
  return out;
}

function concreteDefs(colorHex: string, idSuffix: string): string {
  const id = idSuffix || "0";
  const noiseSeed = parseInt(id, 10) * 17 + 3;
  const sheenLight = lighten(colorHex, 0.16);
  const sheenShadow = darken(colorHex, 0.22);

  // Czysta, niemal gładka powierzchnia betonu: jednolity kolor + bardzo
  // subtelne, drobne ziarno (bez agresywnych smug jak w feTurbulence 0.88).
  return `
    <filter id="grain${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${noiseSeed}" stitchTiles="stitch" result="noise"/>
      <feColorMatrix type="saturate" values="0" in="noise" result="mono"/>
      <feComponentTransfer in="mono">
        <feFuncR type="linear" slope="0.7" intercept="0.15"/>
        <feFuncG type="linear" slope="0.7" intercept="0.15"/>
        <feFuncB type="linear" slope="0.7" intercept="0.15"/>
      </feComponentTransfer>
    </filter>
    <pattern id="concretePat${id}" width="220" height="220" patternUnits="userSpaceOnUse">
      <rect width="220" height="220" fill="${colorHex}"/>
      <rect width="220" height="220" filter="url(#grain${id})" opacity="0.09"/>
    </pattern>
    <linearGradient id="boardSheen${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sheenLight}" stop-opacity="0.55"/>
      <stop offset="16%" stop-color="${sheenLight}" stop-opacity="0.12"/>
      <stop offset="52%" stop-color="${colorHex}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${sheenShadow}" stop-opacity="0.42"/>
    </linearGradient>`;
}

function smoothPostDefs(colorHex: string): string {
  const postLight = lighten(colorHex, 0.1);
  const postDark = darken(colorHex, 0.14);
  return `
    <linearGradient id="smoothPostFill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${postLight}"/>
      <stop offset="22%" stop-color="${colorHex}"/>
      <stop offset="78%" stop-color="${colorHex}"/>
      <stop offset="100%" stop-color="${postDark}"/>
    </linearGradient>`;
}

/** Zamknięta ścieżka deski z falowaną górną i dolną krawędzią. */
function wavyBoardPath(
  x: number,
  y: number,
  w: number,
  h: number,
  amp: number,
): string {
  const seg = 4;
  const segW = w / seg;
  let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
  for (let i = 0; i < seg; i++) {
    const cx = x + segW * i + segW / 2;
    const cy = y + (i % 2 === 0 ? -amp : amp);
    const ex = x + segW * (i + 1);
    d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${y.toFixed(1)}`;
  }
  d += ` L ${(x + w).toFixed(1)} ${(y + h).toFixed(1)}`;
  for (let i = 0; i < seg; i++) {
    const cx = x + w - segW * i - segW / 2;
    const cy = y + h + (i % 2 === 0 ? amp : -amp);
    const ex = x + w - segW * (i + 1);
    d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${(y + h).toFixed(1)}`;
  }
  d += " Z";
  return d;
}

/**
 * Gładka kopuła łuku (górna krawędź panelu górnego).
 * `drop` przesuwa krzywą w dół (np. linia fugi pod łukiem).
 */
function archCrestPath(
  x: number,
  y: number,
  w: number,
  riseH: number,
  drop: number,
): string {
  const N = 48;
  const baseY = y + riseH;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const px = x + t * w;
    const dome = Math.sin(Math.PI * t);
    const py = baseY - dome * riseH * 0.92 + drop;
    d += `${i === 0 ? "M" : " L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  return d;
}

/** Liczba rzędów desek w polu — 3 przy wystarczającej wysokości. */
function boardFieldRowCount(fh: number): number {
  if (fh < 18) return 1;
  if (fh < 34) return 2;
  return 3;
}

function drawBevelBoard(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  if (w < 4 || h < 4) return "";
  const patId = `concretePat${seed}`;
  const edge = darken(colorHex, 0.3);
  const amp = Math.min(5, Math.max(1.4, h * 0.085));
  const path = wavyBoardPath(x, y, w, h, amp);

  // 1) powierzchnia deski, 2) delikatny relief (jasno góra / cień dół),
  // 3) czysty, ale wyraźny obrys falowanej krawędzi.
  let out = `<path d="${path}" fill="url(#${patId})"/>`;
  out += `<path d="${path}" fill="url(#boardSheen${seed})"/>`;
  out += `<path d="${path}" fill="none" stroke="${edge}" stroke-width="0.8" opacity="0.5"/>`;
  return out;
}

function drawBoardPair(
  fx: number,
  rowY: number,
  fw: number,
  boardH: number,
  colorHex: string,
  seed: number,
  ribW: number,
  gap: number,
): string {
  const boardW = (fw - ribW - gap * 2) / 2;
  let out = "";
  out += drawBevelBoard(fx, rowY, boardW, boardH, colorHex, seed);
  out += drawBevelBoard(
    fx + boardW + gap + ribW + gap,
    rowY,
    boardW,
    boardH,
    colorHex,
    seed,
  );
  return out;
}

/**
 * Wpuszczone pole z falowanymi deskami: ciemniejsze tło (fugi), 1–2 rzędy
 * desek oraz pionowe żeberko dzielące je na pół. Wspólne dla panelu głównego
 * i dolnej części panelu górnego.
 */
function drawBoardField(
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  colorHex: string,
  seed: number,
): string {
  if (fh < 6 || fw < 6) return "";
  const recess = darken(colorHex, 0.16);
  const recessTop = darken(colorHex, 0.34);
  const ribW = Math.max(3, fw * 0.05);
  const gap = Math.max(2, fw * 0.03);
  const ribX = fx + (fw - ribW) / 2;
  const rows = boardFieldRowCount(fh);
  const rowGap = rows > 1 ? Math.max(2.5, fh * 0.055) : 0;
  const boardH = (fh - rowGap * (rows - 1)) / rows;

  let out = `<rect x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="${fw.toFixed(1)}" height="${fh.toFixed(1)}" fill="${recess}" rx="1"/>`;
  out += `<rect x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="${fw.toFixed(1)}" height="2" fill="${recessTop}" opacity="0.45"/>`;
  for (let r = 0; r < rows; r++) {
    out += drawBoardPair(
      fx,
      fy + r * (boardH + rowGap),
      fw,
      boardH,
      colorHex,
      seed,
      ribW,
      gap,
    );
  }
  out += drawRib(ribX, fy, ribW, fh, colorHex, seed);
  return out;
}

/** Pionowe żeberko (podniesiony pasek dzielący deski) z reliefem. */
function drawRib(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#concretePat${seed})"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="1.3" height="${h.toFixed(1)}" fill="${lighten(colorHex, 0.16)}" opacity="0.5"/>`;
  out += `<rect x="${(x + w - 1.3).toFixed(1)}" y="${y.toFixed(1)}" width="1.3" height="${h.toFixed(1)}" fill="${darken(colorHex, 0.3)}" opacity="0.5"/>`;
  return out;
}

/** Pełna sylwetka panelu górnego: falowana korona łuku + prostokątny korpus. */
function archPanelSilhouette(
  x: number,
  y: number,
  w: number,
  h: number,
  riseH: number,
): string {
  const bottom = y + h;
  const crest = archCrestPath(x, y, w, riseH, 0);
  return `${crest} L ${(x + w).toFixed(1)} ${bottom.toFixed(1)} L ${x.toFixed(1)} ${bottom.toFixed(1)} Z`;
}

/** Deterministyczny generator pseudolosowy (stały wygląd dla danego seeda). */
function mulberry32(seed: number): () => number {
  let a = (seed * 1013904223 + 12345) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pojedyncza cegiełka ze „schodkiem” na górnej krawędzi. */
function stepTilePath(
  x: number,
  y: number,
  w: number,
  h: number,
  mirror: boolean,
): string {
  const d = h * 0.3;
  const a = mirror ? 0.62 : 0.28;
  const b = a + 0.09;
  if (mirror) {
    return `M ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + w * a).toFixed(1)} ${y.toFixed(1)} L ${(x + w * b).toFixed(1)} ${(y + d).toFixed(1)} L ${(x + w).toFixed(1)} ${(y + d).toFixed(1)} L ${(x + w).toFixed(1)} ${(y + h).toFixed(1)} L ${x.toFixed(1)} ${(y + h).toFixed(1)} Z`;
  }
  return `M ${x.toFixed(1)} ${(y + d).toFixed(1)} L ${(x + w * a).toFixed(1)} ${(y + d).toFixed(1)} L ${(x + w * b).toFixed(1)} ${y.toFixed(1)} L ${(x + w).toFixed(1)} ${y.toFixed(1)} L ${(x + w).toFixed(1)} ${(y + h).toFixed(1)} L ${x.toFixed(1)} ${(y + h).toFixed(1)} Z`;
}

/** 2. Cegiełki przesuwane — rzędy podłużnych płytek z frezowanym schodkiem. */
function drawTileOffset(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 202);
  const rows = Math.min(12, Math.max(4, Math.round(h / 11)));
  const rowH = h / rows;
  const tileW = w / 4.4;
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${darken(colorHex, 0.3)}" rx="1"/>`;
  for (let r = 0; r < rows; r++) {
    const ry = y + r * rowH + 0.7;
    const th = rowH - 1.4;
    let cx = x;
    const first = tileW * (0.35 + rand() * 0.55);
    let i = 0;
    while (cx < x + w - 2) {
      const tw = Math.min(i === 0 ? first : tileW, x + w - cx);
      const path = stepTilePath(cx + 0.6, ry, tw - 1.2, th, (r + i) % 2 === 1);
      out += `<path d="${path}" fill="url(#concretePat${seed})"/>`;
      out += `<path d="${path}" fill="url(#boardSheen${seed})" opacity="0.6"/>`;
      out += `<path d="${path}" fill="none" stroke="${darken(colorHex, 0.34)}" stroke-width="0.9" opacity="0.75"/>`;
      cx += tw;
      i++;
    }
  }
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  return out;
}

/** Rząd deski z fazowaniem (wspólne dla lameli i szerokiej deski). */
function bevelRow(
  x: number,
  ry: number,
  w: number,
  rh: number,
  colorHex: string,
  seed: number,
  shadowFrac: number,
): string {
  let out = `<rect x="${x.toFixed(1)}" y="${ry.toFixed(1)}" width="${w.toFixed(1)}" height="${rh.toFixed(1)}" fill="url(#concretePat${seed})"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${ry.toFixed(1)}" width="${w.toFixed(1)}" height="${rh.toFixed(1)}" fill="url(#boardSheen${seed})"/>`;
  const shadowH = Math.max(1.6, rh * shadowFrac);
  out += `<rect x="${x.toFixed(1)}" y="${(ry + rh - shadowH).toFixed(1)}" width="${w.toFixed(1)}" height="${shadowH.toFixed(1)}" fill="${darken(colorHex, 0.42)}" opacity="0.5"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${ry.toFixed(1)}" width="${w.toFixed(1)}" height="1.2" fill="${lighten(colorHex, 0.2)}" opacity="0.55"/>`;
  return out;
}

/** 5. Deska pozioma — szeroka, mocniej fazowana. */
function drawClapboardWide(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rows = Math.min(4, Math.max(2, Math.round(h / 26)));
  const rowH = h / rows;
  let out = "";
  for (let r = 0; r < rows; r++) {
    out += bevelRow(x, y + r * rowH, w, rowH, colorHex, seed, 0.16);
  }
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  return out;
}

/** 4. Mur — bloki cegiełkowe ze schodkowymi fugami na krawędzi panelu. */
function drawStoneSplit(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 404);
  const rows = 3;
  const rowH = h / rows;
  const grout = darken(colorHex, 0.38);
  const blockW = Math.max(22, w / 5.5);
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${grout}"/>`;

  const minJointOffset = blockW * 0.18;
  let prevJoints: number[] = [];

  for (let r = 0; r < rows; r++) {
    const ry = y + r * rowH;
    const edgeStep = ((seed + r * 11) % 6) / 12;
    const rowShift = r % 2 === 1 ? blockW * 0.48 : 0;
    const rowJoints: number[] = [];
    let cx = x;
    let i = 0;

    while (cx < x + w - 1.5) {
      let bw: number;
      if (i === 0 && rowShift > 0) {
        bw = rowShift;
      } else if (i === 0) {
        bw = blockW * (0.42 + edgeStep + rand() * 0.08);
      } else {
        bw = blockW * (0.88 + rand() * 0.18);
      }
      // Odsuń spoinę pionową od spoiny w wierszu wyżej, żeby nie tworzyły jednej linii.
      const jointX = cx + bw;
      const near = prevJoints.find((j) => Math.abs(j - jointX) < minJointOffset);
      if (near !== undefined) {
        bw += jointX >= near ? minJointOffset : -minJointOffset;
      }
      const remaining = x + w - cx;
      // Docięta cegła na końcu wiersza — bez pozostawiania szpary fugi przy krawędzi.
      if (remaining - bw < blockW * 0.3) bw = remaining;
      const actualW = Math.min(bw, remaining);
      if (actualW < remaining - 1) rowJoints.push(cx + actualW);
      const bx = cx + 1.2;
      const by = ry + 1.4;
      const iw = actualW - 2.4;
      const ih = rowH - 2.8;

      if (iw > 3 && ih > 5) {
        out += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" fill="url(#concretePat${seed})" rx="0.8"/>`;
        for (let p = 0; p < 2; p++) {
          const px1 = bx + rand() * iw * 0.55;
          const py1 = by + rand() * ih * 0.55;
          const pw = iw * (0.2 + rand() * 0.3);
          const ph = ih * (0.2 + rand() * 0.3);
          const tone =
            p % 2 === 0 ? lighten(colorHex, 0.12) : darken(colorHex, 0.16);
          out += `<ellipse cx="${(px1 + pw / 2).toFixed(1)}" cy="${(py1 + ph / 2).toFixed(1)}" rx="${(pw / 2).toFixed(1)}" ry="${(ph / 2).toFixed(1)}" fill="${tone}" opacity="0.18"/>`;
        }
        out += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${iw.toFixed(1)}" height="1" fill="${lighten(colorHex, 0.16)}" opacity="0.35"/>`;
        out += `<rect x="${bx.toFixed(1)}" y="${(by + ih - 1.2).toFixed(1)}" width="${iw.toFixed(1)}" height="1.2" fill="${darken(colorHex, 0.32)}" opacity="0.4"/>`;
      }
      cx += actualW;
      i++;
    }
    prevJoints = rowJoints;
  }
  return out;
}

/** Cegiełka — drobne wypukłe cegiełki z fazowanymi krawędziami, wiązanie połówkowe. */
function drawBrickSmall(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 505);
  const frame = Math.min(Math.max(Math.min(w, h) * 0.055, 2.5), 7);
  const ix = x + frame;
  const iy = y + frame;
  const iw = w - frame * 2;
  const ih = h - frame * 2;
  const rows = Math.max(3, Math.round(ih / 12.5));
  const rowH = ih / rows;
  const brickW = rowH * 2.15;
  const gap = Math.min(1.4, rowH * 0.1);
  const clipId = `brickSm${seed}_${Math.round(x * 10)}_${Math.round(y * 10)}`;

  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#concretePat${seed})" rx="1"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${lighten(colorHex, 0.06)}" opacity="0.22" rx="1"/>`;
  out += `<defs><clipPath id="${clipId}"><rect x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}"/></clipPath></defs>`;
  out += `<rect x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" fill="${darken(colorHex, 0.28)}"/>`;
  out += `<g clip-path="url(#${clipId})">`;

  for (let r = 0; r < rows; r++) {
    const by = iy + r * rowH + gap / 2;
    const bh = rowH - gap;
    const startX = ix - (r % 2 === 1 ? brickW / 2 : 0);
    for (let bx = startX; bx < ix + iw; bx += brickW) {
      const bx1 = bx + gap / 2;
      const bw = brickW - gap;
      const t = Math.min(bw, bh) * 0.3;
      const tone =
        rand() > 0.5
          ? lighten(colorHex, 0.02 + rand() * 0.05)
          : darken(colorHex, 0.01 + rand() * 0.04);
      out += `<rect x="${bx1.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="url(#concretePat${seed})" rx="0.6"/>`;
      out += `<rect x="${bx1.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${tone}" opacity="0.25" rx="0.6"/>`;
      out += `<polygon points="${bx1.toFixed(1)},${by.toFixed(1)} ${(bx1 + bw).toFixed(1)},${by.toFixed(1)} ${(bx1 + bw - t).toFixed(1)},${(by + t).toFixed(1)} ${(bx1 + t).toFixed(1)},${(by + t).toFixed(1)}" fill="${lighten(colorHex, 0.2)}" opacity="0.5"/>`;
      out += `<polygon points="${bx1.toFixed(1)},${by.toFixed(1)} ${(bx1 + t).toFixed(1)},${(by + t).toFixed(1)} ${(bx1 + t).toFixed(1)},${(by + bh - t).toFixed(1)} ${bx1.toFixed(1)},${(by + bh).toFixed(1)}" fill="${lighten(colorHex, 0.08)}" opacity="0.3"/>`;
      out += `<polygon points="${bx1.toFixed(1)},${(by + bh).toFixed(1)} ${(bx1 + t).toFixed(1)},${(by + bh - t).toFixed(1)} ${(bx1 + bw - t).toFixed(1)},${(by + bh - t).toFixed(1)} ${(bx1 + bw).toFixed(1)},${(by + bh).toFixed(1)}" fill="${darken(colorHex, 0.24)}" opacity="0.5"/>`;
      out += `<polygon points="${(bx1 + bw).toFixed(1)},${by.toFixed(1)} ${(bx1 + bw).toFixed(1)},${(by + bh).toFixed(1)} ${(bx1 + bw - t).toFixed(1)},${(by + bh - t).toFixed(1)} ${(bx1 + bw - t).toFixed(1)},${(by + t).toFixed(1)}" fill="${darken(colorHex, 0.12)}" opacity="0.35"/>`;
      out += `<rect x="${(bx1 + t).toFixed(1)}" y="${(by + t).toFixed(1)}" width="${(bw - t * 2).toFixed(1)}" height="${(bh - t * 2).toFixed(1)}" fill="${lighten(colorHex, 0.05)}" opacity="0.18"/>`;
      out += `<rect x="${bx1.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.32)}" stroke-width="0.7" opacity="0.5" rx="0.6"/>`;
    }
  }

  out += `</g>`;
  out += `<rect x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.3)}" stroke-width="1" opacity="0.7"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  return out;
}

/** 6. Fala piaskowa 3D — poziome wydmy z cieniowanymi bruzdami. */
function drawWaveDunes(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 606);
  const bands = Math.min(6, Math.max(3, Math.round(h / 16)));
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#concretePat${seed})" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#boardSheen${seed})" opacity="0.4"/>`;
  const N = 32;
  for (let b = 1; b < bands; b++) {
    const baseY = y + (h * b) / bands;
    const amp = (h / bands) * (0.28 + rand() * 0.18);
    const freq = 1 + rand() * 0.9;
    const phase = rand() * Math.PI * 2;
    let dDark = "";
    let dLight = "";
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const px = x + t * w;
      const py = baseY + Math.sin(t * Math.PI * 2 * freq + phase) * amp;
      dDark += `${i === 0 ? "M" : " L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
      dLight += `${i === 0 ? "M" : " L"} ${px.toFixed(1)} ${(py + 2.2).toFixed(1)}`;
    }
    out += `<path d="${dDark}" fill="none" stroke="${darken(colorHex, 0.36)}" stroke-width="1.7" opacity="0.55" stroke-linecap="round"/>`;
    out += `<path d="${dLight}" fill="none" stroke="${lighten(colorHex, 0.18)}" stroke-width="1.1" opacity="0.5" stroke-linecap="round"/>`;
  }
  return out;
}

/** 7. Beton architektoniczny — gładki, z przetarciami i nakropieniem. */
function drawConcreteSmooth(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 707);
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#concretePat${seed})" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  for (let i = 0; i < 5; i++) {
    const rx = w * (0.1 + rand() * 0.16);
    const ry = h * (0.12 + rand() * 0.16);
    const cx = x + rx + rand() * (w - rx * 2);
    const cy = y + ry + rand() * (h - ry * 2);
    const tone = i % 2 === 0 ? darken(colorHex, 0.14) : lighten(colorHex, 0.12);
    out += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${tone}" opacity="0.1"/>`;
  }
  for (let i = 0; i < 46; i++) {
    const cx = x + 2 + rand() * (w - 4);
    const cy = y + 2 + rand() * (h - 4);
    out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(0.4 + rand() * 0.6).toFixed(1)}" fill="${darken(colorHex, 0.45)}" opacity="0.16"/>`;
  }
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#boardSheen${seed})" opacity="0.35"/>`;
  return out;
}

/** Moduł faset dla wzoru „diamenty" (współrzędne 0–1). */
const SHARD_POLYGONS: { pts: [number, number][]; light: boolean }[] = [
  { pts: [[0, 0.12], [0.34, 0.02], [0.5, 0.22], [0.14, 0.34]], light: true },
  { pts: [[0.36, 0], [0.82, 0.06], [0.56, 0.3]], light: false },
  { pts: [[0.05, 0.44], [0.5, 0.3], [0.72, 0.55], [0.26, 0.62]], light: false },
  { pts: [[0.55, 0.32], [1, 0.22], [0.82, 0.52]], light: true },
  { pts: [[0.14, 0.7], [0.6, 0.62], [0.42, 0.94], [0.06, 0.88]], light: true },
  { pts: [[0.62, 0.6], [0.96, 0.56], [1, 0.82], [0.56, 0.92]], light: false },
  { pts: [[0, 0.58], [0.16, 0.5], [0.2, 0.76], [0.02, 0.8]], light: false },
  { pts: [[0.84, 0.05], [1, 0], [1, 0.18]], light: true },
];

/** 9. Diamenty — łamane, ukośne fasety. */
function drawShards(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 909);
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#concretePat${seed})" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#boardSheen${seed})" opacity="0.4"/>`;
  const cells = Math.max(1, Math.round(w / (h * 1.7)));
  const cellW = w / cells;
  for (let c = 0; c < cells; c++) {
    const cx = x + c * cellW;
    for (const shard of SHARD_POLYGONS) {
      const pts = shard.pts.map(([ux, uy]) => {
        const jx = (rand() - 0.5) * cellW * 0.04;
        const jy = (rand() - 0.5) * h * 0.04;
        return `${(cx + ux * cellW + jx).toFixed(1)},${(y + uy * h + jy).toFixed(1)}`;
      });
      const tone = shard.light
        ? lighten(colorHex, 0.12)
        : darken(colorHex, 0.14);
      out += `<polygon points="${pts.join(" ")}" fill="${tone}" opacity="0.2"/>`;
      out += `<polygon points="${pts.join(" ")}" fill="none" stroke="${darken(colorHex, 0.34)}" stroke-width="1" opacity="0.45"/>`;
      const [p1, p2] = pts;
      out += `<line x1="${p1.split(",")[0]}" y1="${p1.split(",")[1]}" x2="${p2.split(",")[0]}" y2="${p2.split(",")[1]}" stroke="${lighten(colorHex, 0.2)}" stroke-width="1" opacity="0.45"/>`;
    }
  }
  return out;
}

/**
 * Poszarpana pozioma krawędź (segment ścieżki "L x y ..." od x1 do x2).
 * Używana do organicznych brzegów prześwitów w panelach górnych.
 */
function roughEdgePoints(
  x1: number,
  x2: number,
  yBase: number,
  amp: number,
  rand: () => number,
  segs = 7,
): string {
  let d = "";
  for (let i = 0; i <= segs; i++) {
    const px = x1 + ((x2 - x1) * i) / segs;
    const py = i === 0 || i === segs ? yBase : yBase + (rand() - 0.5) * amp * 2;
    d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  return d;
}

/** Prostokątny prześwit z poszarpanymi krawędziami (podścieżka dziury). */
function roughHolePath(
  x1: number,
  x2: number,
  yTop: number,
  yBottom: number,
  amp: number,
  rand: () => number,
): string {
  let d = `M ${x1.toFixed(1)} ${yTop.toFixed(1)}`;
  d += roughEdgePoints(x1, x2, yTop, amp, rand);
  d += ` L ${x2.toFixed(1)} ${yBottom.toFixed(1)}`;
  d += roughEdgePoints(x2, x1, yBottom, amp, rand);
  d += " Z";
  return d;
}

/** Soczewkowaty prześwit („oczko") dla fali przeplatanej. */
function lensHolePath(
  cx: number,
  cy: number,
  lw: number,
  lh: number,
): string {
  const x1 = cx - lw / 2;
  const x2 = cx + lw / 2;
  return `M ${x1.toFixed(1)} ${cy.toFixed(1)} Q ${cx.toFixed(1)} ${(cy - lh).toFixed(1)} ${x2.toFixed(1)} ${cy.toFixed(1)} Q ${cx.toFixed(1)} ${(cy + lh).toFixed(1)} ${x1.toFixed(1)} ${cy.toFixed(1)} Z`;
}

/** 10. Panel górny: fala przeplatana z soczewkowatymi prześwitami. */
function drawWaveCrestWeave(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 111);
  const N = 36;
  const crestAmp = h * 0.09;
  const phase = rand() * Math.PI * 2;

  let outer = "";
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const py =
      y + crestAmp * (1 + Math.sin(t * Math.PI * 2 * 1.1 + phase)) * 0.5;
    outer += `${i === 0 ? "M" : " L"} ${(x + t * w).toFixed(1)} ${py.toFixed(1)}`;
  }
  outer += ` L ${(x + w).toFixed(1)} ${(y + h).toFixed(1)} L ${x.toFixed(1)} ${(y + h).toFixed(1)} Z`;

  let holes = "";
  const rowCenters = [0.32, 0.55, 0.78];
  rowCenters.forEach((rc, r) => {
    const count = 3;
    for (let k = 0; k < count; k++) {
      const tc = (k + 0.5) / count + (r % 2 === 0 ? 0.06 : -0.06);
      if (tc < 0.1 || tc > 0.9) continue;
      const lw = w * (0.15 + rand() * 0.06);
      const lh = h * (0.055 + rand() * 0.035);
      const cy = y + h * rc + (rand() - 0.5) * h * 0.05;
      holes += ` ${lensHolePath(x + tc * w, cy, lw, lh)}`;
    }
  });

  const d = outer + holes;
  let out = `<path d="${d}" fill="url(#concretePat${seed})" fill-rule="evenodd" stroke="${darken(colorHex, 0.3)}" stroke-width="1"/>`;
  out += `<path d="${d}" fill="url(#boardSheen${seed})" fill-rule="evenodd" opacity="0.45"/>`;

  // Płynące linie fal między rzędami oczek.
  for (let b = 0; b < 3; b++) {
    const baseY = y + h * (0.22 + b * 0.24);
    const amp = h * (0.05 + rand() * 0.04);
    const freq = 0.9 + rand() * 0.7;
    const ph = rand() * Math.PI * 2;
    let dDark = "";
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const py = baseY + Math.sin(t * Math.PI * 2 * freq + ph) * amp;
      dDark += `${i === 0 ? "M" : " L"} ${(x + t * w).toFixed(1)} ${py.toFixed(1)}`;
    }
    out += `<path d="${dDark}" fill="none" stroke="${darken(colorHex, 0.32)}" stroke-width="1.4" opacity="0.4" stroke-linecap="round"/>`;
    out += `<path d="${dDark}" fill="none" stroke="${lighten(colorHex, 0.16)}" stroke-width="1" opacity="0.35" stroke-linecap="round" transform="translate(0 2)"/>`;
  }
  return out;
}

/** 11. Panel górny: proste belki z podłużnymi prześwitami. */
function drawSlotTop(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 222);
  const outer = `M ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + w).toFixed(1)} ${y.toFixed(1)} L ${(x + w).toFixed(1)} ${(y + h).toFixed(1)} L ${x.toFixed(1)} ${(y + h).toFixed(1)} Z`;

  const margin = w * 0.035;
  const mullW = w * 0.06;
  const xc = x + w / 2;
  const slotH = h * 0.14;
  const amp = slotH * 0.3;
  let holes = "";
  for (const rc of [0.3, 0.72]) {
    const yTop = y + h * rc - slotH / 2;
    const yBot = y + h * rc + slotH / 2;
    holes += ` ${roughHolePath(x + margin, xc - mullW / 2, yTop, yBot, amp, rand)}`;
    holes += ` ${roughHolePath(xc + mullW / 2, x + w - margin, yTop, yBot, amp, rand)}`;
  }

  const d = outer + holes;
  let out = `<path d="${d}" fill="url(#concretePat${seed})" fill-rule="evenodd" stroke="${darken(colorHex, 0.3)}" stroke-width="1"/>`;
  out += `<path d="${d}" fill="url(#boardSheen${seed})" fill-rule="evenodd" opacity="0.5"/>`;

  // Poziomy „słój" na belkach.
  for (const gc of [0.12, 0.5, 0.9]) {
    const yy = y + h * gc;
    let dg = `M ${(x + 3).toFixed(1)} ${yy.toFixed(1)}`;
    dg += roughEdgePoints(x + 3, x + w - 3, yy, 1.6, rand, 8);
    out += `<path d="${dg}" fill="none" stroke="${darken(colorHex, 0.22)}" stroke-width="0.7" opacity="0.3"/>`;
  }
  return out;
}

/** 12. Panel górny: łuk z belkami i prześwitami. */
function drawArchRails(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 333);
  const N = 36;
  const rise = h * 0.24;

  // Kopuła łuku (najwyżej pośrodku).
  const domeY = (t: number) => y + rise * (1 - Math.sin(Math.PI * t) * 0.92);
  let outer = "";
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    outer += `${i === 0 ? "M" : " L"} ${(x + t * w).toFixed(1)} ${domeY(t).toFixed(1)}`;
  }
  outer += ` L ${(x + w).toFixed(1)} ${(y + h).toFixed(1)} L ${x.toFixed(1)} ${(y + h).toFixed(1)} Z`;

  const mullW = w * 0.055;
  const xc = x + w / 2;
  const railH = h * 0.2;
  const amp = h * 0.03;

  // Prześwit A: pod łukiem (górna krawędź podąża za kopułą).
  let holes = "";
  const bandBottomA = y + h * 0.52;
  for (const [hx1, hx2] of [
    [x + w * 0.02, xc - mullW / 2],
    [xc + mullW / 2, x + w * 0.98],
  ] as const) {
    let dHole = "";
    const segs = 10;
    for (let i = 0; i <= segs; i++) {
      const px = hx1 + ((hx2 - hx1) * i) / segs;
      const t = (px - x) / w;
      const py = domeY(t) + railH + (rand() - 0.5) * amp;
      dHole += `${i === 0 ? "M" : " L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    dHole += ` L ${hx2.toFixed(1)} ${bandBottomA.toFixed(1)}`;
    dHole += roughEdgePoints(hx2, hx1, bandBottomA, amp, rand, 8);
    dHole += " Z";
    holes += ` ${dHole}`;
  }

  // Prześwit B: między środkową a dolną belką.
  const bTop = y + h * 0.7;
  const bBot = y + h * 0.84;
  holes += ` ${roughHolePath(x + w * 0.02, xc - mullW / 2, bTop, bBot, amp, rand)}`;
  holes += ` ${roughHolePath(xc + mullW / 2, x + w * 0.98, bTop, bBot, amp, rand)}`;

  const d = outer + holes;
  let out = `<path d="${d}" fill="url(#concretePat${seed})" fill-rule="evenodd" stroke="${darken(colorHex, 0.3)}" stroke-width="1"/>`;
  out += `<path d="${d}" fill="url(#boardSheen${seed})" fill-rule="evenodd" opacity="0.5"/>`;

  // Słój wzdłuż łuku i belek.
  let dArc = "";
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    dArc += `${i === 0 ? "M" : " L"} ${(x + t * w).toFixed(1)} ${(domeY(t) + railH * 0.55 + (rand() - 0.5) * 1.6).toFixed(1)}`;
  }
  out += `<path d="${dArc}" fill="none" stroke="${darken(colorHex, 0.24)}" stroke-width="0.8" opacity="0.35"/>`;
  for (const gc of [0.62, 0.92]) {
    const yy = y + h * gc;
    let dg = `M ${(x + 3).toFixed(1)} ${yy.toFixed(1)}`;
    dg += roughEdgePoints(x + 3, x + w - 3, yy, 1.6, rand, 8);
    out += `<path d="${dg}" fill="none" stroke="${darken(colorHex, 0.24)}" stroke-width="0.7" opacity="0.3"/>`;
  }
  return out;
}

/** Wewnętrzna tekstura piaskowca — ledgestone (poziome paski kamienia). */
function drawSandstoneInner(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 501);
  const grout = darken(colorHex, 0.36);
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${grout}"/>`;
  let cy = y + 1.5;
  const bottom = y + h - 1.5;

  while (cy < bottom - 4) {
    const stripH = Math.min(bottom - cy - 2, h * (0.055 + rand() * 0.045));
    let cx = x + 1.5;
    const right = x + w - 1.5;

    while (cx < right - 6) {
      const stripW = Math.min(
        right - cx - 2,
        w * (0.12 + rand() * 0.22),
      );
      const tone = rand() > 0.5 ? lighten(colorHex, 0.08) : darken(colorHex, 0.1);
      out += `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${stripW.toFixed(1)}" height="${stripH.toFixed(1)}" fill="url(#concretePat${seed})" rx="0.6"/>`;
      out += `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${stripW.toFixed(1)}" height="${stripH.toFixed(1)}" fill="${tone}" opacity="0.14" rx="0.6"/>`;
      out += `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${stripW.toFixed(1)}" height="1" fill="${lighten(colorHex, 0.14)}" opacity="0.4"/>`;
      cx += stripW + 1.8;
    }
    cy += stripH + 2.2;
  }
  return out;
}

/** Piaskowiec — panel główny. */
function drawSandstone(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  let out = drawSandstoneInner(x, y, w, h, colorHex, seed);
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  return out;
}

/** Piaskowiec łuk — panel górny z gładką kopułą. */
function drawSandstoneArch(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const riseH = Math.min(Math.max(h * 0.32, 22), h * 0.5);
  const sil = archPanelSilhouette(x, y, w, h, riseH);
  const clipId = `sandArch${seed}_${Math.round(x * 10)}`;
  const frameStroke = darken(colorHex, 0.24);
  let out = `<defs><clipPath id="${clipId}"><path d="${sil}"/></clipPath></defs>`;
  out += `<g clip-path="url(#${clipId})">${drawSandstoneInner(x, y, w, h, colorHex, seed)}</g>`;
  out += `<path d="${sil}" fill="none" stroke="${frameStroke}" stroke-width="1"/>`;
  return out;
}

/**
 * Kamienie muru z otoczaków (projekt w układzie 400×120).
 * tone = odchylenie jasności od koloru bazowego: >0 lighten, <0 darken.
 */
const FIELDSTONE_STONES: { d: string; tone: number }[] = [
  { d: "M4.5 0.4L25.1 -2.8Q28.3 -3.3 31.5 -2.8L52.1 0.4Q55.3 0.9 55.2 3.0L54.6 16.8Q54.5 18.9 54.3 21.1L53.2 34.8Q53.0 37.0 49.9 37.3L30.3 39.7Q27.2 40.0 24.1 40.0L4.4 39.8Q1.3 39.8 1.7 37.4L4.1 22.7Q4.5 20.3 4.1 18.0L1.7 3.2Q1.3 0.9 4.5 0.4Z", tone: 0.035 },
  { d: "M60.1 1.3L76.3 4.6Q78.9 5.1 81.4 4.6L97.6 1.3Q100.2 0.8 99.8 2.9L97.0 16.1Q96.6 18.1 96.6 20.3L97.1 33.7Q97.2 35.8 94.7 35.3L78.6 32.4Q76.1 31.9 73.6 32.5L57.7 36.3Q55.2 36.9 55.4 34.8L56.5 21.1Q56.7 18.9 56.8 16.7L57.4 3.0Q57.5 0.8 60.1 1.3Z", tone: 0.015 },
  { d: "M104.8 0.4L120.4 -2.0Q122.8 -2.4 125.3 -2.0L140.8 0.4Q143.3 0.8 144.3 2.9L151.1 16.4Q152.2 18.5 152.3 20.9L153.1 36.0Q153.3 38.3 150.1 37.5L129.8 32.5Q126.6 31.6 123.3 32.1L102.6 35.3Q99.3 35.8 99.3 33.7L98.8 20.2Q98.7 18.1 99.1 16.0L101.9 2.9Q102.3 0.8 104.8 0.4Z", tone: -0.06 },
  { d: "M148.1 1.3L165.1 3.7Q167.8 4.1 170.5 3.7L187.6 1.3Q190.2 0.9 190.4 3.4L191.7 19.3Q191.9 21.8 192.0 24.3L193.1 40.1Q193.2 42.6 191.0 42.0L176.9 37.9Q174.7 37.2 172.4 37.4L157.7 38.3Q155.4 38.5 155.2 36.1L154.4 21.0Q154.3 18.7 153.2 16.5L146.4 3.1Q145.4 0.9 148.1 1.3Z", tone: -0.06 },
  { d: "M196.9 1.1L217.8 2.3Q221.1 2.5 224.4 2.3L245.3 1.1Q248.6 0.9 251.3 0.8L268.1 -0.1Q270.8 -0.3 273.4 -0.1L290.3 0.8Q292.9 0.9 293.3 2.9L295.5 15.9Q295.9 17.9 296.3 19.9L299.4 32.7Q299.9 34.7 296.8 34.9L277.4 36.1Q274.3 36.3 271.3 36.9L252.2 41.0Q249.2 41.7 246.1 41.4L226.0 40.0Q222.9 39.8 219.7 40.1L199.8 42.3Q196.6 42.6 196.5 40.1L195.4 24.3Q195.2 21.7 195.0 19.2L193.8 3.4Q193.6 0.9 196.9 1.1Z", tone: 0.015 },
  { d: "M299.8 1.4L321.1 5.0Q324.4 5.5 327.8 5.0L349.0 1.4Q352.4 0.8 352.5 2.6L353.1 14.0Q353.2 15.8 352.7 17.6L349.6 28.6Q349.1 30.3 346.4 31.0L329.3 35.7Q326.6 36.5 323.9 36.3L306.2 34.8Q303.4 34.6 302.9 32.6L299.9 19.8Q299.4 17.8 299.1 15.8L296.8 2.8Q296.5 0.8 299.8 1.4Z", tone: -0.035 },
  { d: "M357.3 0.7L374.2 0.4Q376.8 0.3 379.5 0.4L396.3 0.7Q398.9 0.8 399.3 3.1L401.6 17.6Q401.9 19.9 401.6 22.2L399.3 36.7Q398.9 39.0 396.1 38.6L377.9 36.0Q375.0 35.5 372.2 34.9L354.2 30.9Q351.4 30.3 351.9 28.6L355.0 17.6Q355.5 15.8 355.4 14.0L354.8 2.6Q354.7 0.8 357.3 0.7Z", tone: 0.015 },
  { d: "M4.4 41.6L24.1 41.9Q27.2 41.9 30.3 41.5L49.9 39.2Q53.0 38.8 53.0 41.9L52.7 61.1Q52.6 64.1 53.6 67.0L59.8 85.2Q60.8 88.0 57.3 86.9L34.9 79.7Q31.4 78.5 27.8 77.7L4.9 72.7Q1.3 71.9 1.1 70.1L-0.4 58.6Q-0.6 56.8 -0.4 54.9L1.1 43.4Q1.3 41.6 4.4 41.6Z", tone: -0.06 },
  { d: "M57.7 38.2L73.6 34.4Q76.1 33.8 78.6 34.2L94.6 37.2Q97.2 37.6 97.0 39.8L96.1 53.3Q95.9 55.5 95.7 57.6L93.9 71.1Q93.6 73.2 91.9 74.4L81.2 81.8Q79.5 83.0 77.5 83.6L64.9 87.4Q63.0 88.0 62.0 85.1L55.8 66.9Q54.8 64.1 54.8 61.0L55.1 41.8Q55.2 38.8 57.7 38.2Z", tone: 0.015 },
  { d: "M102.5 37.0L123.2 33.9Q126.5 33.4 129.7 34.2L150.0 39.3Q153.2 40.1 152.8 42.5L150.4 57.6Q150.1 60.0 149.1 62.2L143.0 76.3Q142.0 78.5 139.3 77.7L122.0 72.7Q119.3 71.8 116.5 72.0L98.5 72.9Q95.7 73.0 95.9 70.9L97.7 57.5Q98.0 55.3 98.2 53.2L99.1 39.6Q99.2 37.5 102.5 37.0Z", tone: -0.035 },
  { d: "M157.9 40.1L172.6 39.2Q174.9 39.0 177.1 39.7L191.2 43.8Q193.4 44.4 194.1 46.6L198.1 60.5Q198.7 62.7 200.1 64.5L209.1 75.8Q210.6 77.6 206.6 78.1L181.5 81.4Q177.5 81.9 173.6 81.5L148.4 79.1Q144.4 78.7 145.3 76.5L151.5 62.4Q152.4 60.2 152.8 57.8L155.2 42.7Q155.6 40.3 157.9 40.1Z", tone: 0.015 },
  { d: "M198.8 44.1L218.8 41.9Q221.9 41.6 225.1 41.8L245.1 43.2Q248.3 43.5 248.4 45.2L249.3 56.3Q249.4 58.1 248.8 59.7L245.0 70.2Q244.4 71.9 242.6 72.6L231.0 77.0Q229.1 77.6 227.2 77.6L214.8 77.6Q212.8 77.6 211.4 75.8L202.4 64.5Q200.9 62.7 200.3 60.5L196.3 46.6Q195.7 44.4 198.8 44.1Z", tone: 0.05 },
  { d: "M254.6 42.6L273.7 38.5Q276.7 37.9 279.8 37.7L299.2 36.5Q302.3 36.3 305.1 36.5L322.7 38.0Q325.5 38.2 328.2 37.4L345.3 32.7Q348.0 32.0 348.4 34.5L350.9 50.2Q351.4 52.6 352.0 55.1L355.8 70.5Q356.4 72.9 352.7 73.1L329.2 74.1Q325.5 74.3 321.8 74.5L298.3 75.7Q294.6 75.9 291.8 75.5L274.1 73.1Q271.3 72.7 268.5 72.6L250.6 71.8Q247.8 71.7 248.4 70.0L252.2 59.6Q252.8 57.9 252.6 56.1L251.8 45.0Q251.6 43.3 254.6 42.6Z", tone: 0.015 },
  { d: "M354.2 32.6L372.2 36.6Q375.0 37.2 377.9 37.6L396.1 40.3Q399.0 40.7 398.6 42.6L396.2 55.0Q395.9 56.9 396.2 58.9L398.6 71.2Q399.0 73.1 396.6 73.3L381.8 74.1Q379.4 74.3 377.1 74.1L362.2 73.1Q359.9 72.9 359.3 70.5L355.4 55.1Q354.8 52.6 354.4 50.1L351.8 34.4Q351.4 32.0 354.2 32.6Z", tone: 0.035 },
  { d: "M4.9 74.5L27.8 79.6Q31.4 80.4 34.9 81.5L57.2 88.7Q60.7 89.8 59.9 91.6L54.8 102.6Q54.0 104.3 53.3 106.1L48.7 117.3Q48.0 119.1 45.2 119.3L27.4 120.6Q24.6 120.8 21.8 120.6L4.0 119.3Q1.2 119.1 1.1 116.4L-0.1 99.1Q-0.3 96.4 -0.1 93.7L1.1 76.4Q1.2 73.7 4.9 74.5Z", tone: 0 },
  { d: "M66.0 89.2L78.5 85.5Q80.5 84.9 82.2 83.7L92.9 76.2Q94.6 75.0 97.5 74.9L115.4 74.0Q118.3 73.8 121.0 74.6L138.2 79.7Q141.0 80.5 141.0 82.9L141.1 98.1Q141.1 100.5 141.9 102.7L147.3 116.9Q148.2 119.1 145.4 119.2L127.9 119.6Q125.1 119.7 122.3 119.6L104.7 119.2Q102.0 119.1 98.9 118.7L79.6 115.9Q76.6 115.4 73.6 115.9L54.3 118.7Q51.2 119.1 51.9 117.3L56.5 106.1Q57.2 104.3 58.0 102.6L63.2 91.6Q64.0 89.8 66.0 89.2Z", tone: -0.085 },
  { d: "M149.6 80.8L174.8 83.2Q178.8 83.6 182.7 83.1L207.8 79.8Q211.8 79.3 213.8 79.3L226.2 79.4Q228.1 79.4 230.0 78.7L241.6 74.3Q243.4 73.6 244.6 76.3L251.8 93.1Q252.9 95.8 253.6 98.5L258.3 116.2Q259.0 119.0 255.9 118.9L236.0 118.0Q232.8 117.8 229.7 118.0L209.7 118.9Q206.6 119.0 203.4 118.5L182.9 115.0Q179.7 114.4 176.5 115.0L156.1 118.5Q152.8 119.0 152.0 116.8L146.6 102.6Q145.7 100.4 145.7 98.0L145.6 82.8Q145.6 80.5 149.6 80.8Z", tone: -0.06 },
  { d: "M249.5 73.7L267.3 74.5Q270.2 74.6 273.0 74.9L290.7 77.4Q293.4 77.8 293.7 80.2L295.3 96.1Q295.5 98.5 296.1 101.0L299.4 116.5Q299.9 119.0 297.6 119.5L283.3 122.5Q281.1 123.0 278.8 122.5L264.5 119.5Q262.3 119.0 261.5 116.2L256.9 98.5Q256.2 95.7 255.0 93.1L247.8 76.3Q246.7 73.6 249.5 73.7Z", tone: -0.035 },
  { d: "M299.5 77.6L323.1 76.4Q326.8 76.2 330.5 76.1L354.0 75.0Q357.7 74.9 357.6 77.5L357.0 94.4Q356.9 97.1 357.4 99.7L360.3 116.4Q360.8 119.0 357.3 119.8L335.0 124.6Q331.5 125.3 328.0 124.6L305.8 119.8Q302.3 119.0 301.7 116.6L298.4 101.0Q297.9 98.6 297.7 96.1L296.1 80.3Q295.8 77.8 299.5 77.6Z", tone: 0.05 },
  { d: "M362.3 75.0L377.2 76.0Q379.5 76.1 381.9 76.0L396.7 75.2Q399.1 75.0 398.6 77.7L395.7 94.4Q395.3 97.0 395.7 99.6L398.6 116.3Q399.1 119.0 396.9 118.8L383.2 117.7Q381.1 117.6 378.9 117.7L365.2 118.8Q363.1 119.0 362.6 116.3L359.6 99.7Q359.2 97.0 359.3 94.4L359.9 77.5Q360.0 74.8 362.3 75.0Z", tone: 0.015 },
];

/** Rysy i cienie na kamieniach (układ 400×120). */
const FIELDSTONE_CRACKS: { d: string; opacity: number }[] = [
  { d: "M8.1 20.2Q3.2 29.2 5.3 36.7", opacity: 0.51 },
  { d: "M59.8 18.9Q51.3 28.9 58.5 34.2", opacity: 0.38 },
  { d: "M140.5 3.3Q136.4 -3.8 123.1 0.6", opacity: 0.34 },
  { d: "M168.4 6.5Q154.6 4.2 149.3 3.9", opacity: 0.54 },
  { d: "M288.5 18.2Q268.1 9.0 248.3 3.8", opacity: 0.55 },
  { d: "M324.6 7.4Q312.5 14.6 303.3 17.8", opacity: 0.46 },
  { d: "M358.0 3.4Q381.1 0.3 395.6 3.4", opacity: 0.47 },
  { d: "M31.0 75.8Q9.8 69.8 3.8 57.3", opacity: 0.37 },
  { d: "M5.3 70.1Q29.3 80.4 55.9 83.9", opacity: 0.54 },
  { d: "M99.8 70.5Q106.0 71.9 119.9 69.5", opacity: 0.36 },
  { d: "M139.1 75.2Q123.6 77.6 99.8 70.5", opacity: 0.52 },
  { d: "M195.3 62.4Q185.3 69.7 177.3 78.7", opacity: 0.52 },
  { d: "M244.8 45.9Q234.5 39.8 222.4 44.3", opacity: 0.36 },
  { d: "M280.2 40.5Q309.4 33.2 340.8 35.5", opacity: 0.52 },
  { d: "M280.2 40.5Q317.9 47.1 343.7 53.1", opacity: 0.39 },
  { d: "M393.0 56.6Q385.1 49.0 375.3 39.9", opacity: 0.31 },
  { d: "M362.4 70.2Q355.6 58.9 358.1 53.0", opacity: 0.52 },
  { d: "M50.0 103.7Q31.2 97.3 3.9 97.0", opacity: 0.4 },
  { d: "M55.8 91.4Q39.6 101.7 25.1 117.8", opacity: 0.32 },
  { d: "M69.4 91.4Q72.2 87.6 83.4 87.2", opacity: 0.48 },
  { d: "M141.0 116.3Q99.7 108.5 63.6 103.7", opacity: 0.49 },
  { d: "M182.4 85.9Q196.9 100.3 206.1 116.0", opacity: 0.44 },
  { d: "M154.3 100.1Q199.7 109.8 250.6 116.0", opacity: 0.49 },
  { d: "M251.0 77.2Q273.4 83.4 292.6 98.4", opacity: 0.48 },
  { d: "M306.2 116.0Q334.6 93.1 353.4 78.4", opacity: 0.41 },
  { d: "M327.1 79.6Q346.7 100.2 356.0 116.0", opacity: 0.55 },
  { d: "M365.5 115.7Q374.9 107.1 392.9 97.0", opacity: 0.52 },
  { d: "M379.5 79.3Q389.7 85.1 392.9 97.0", opacity: 0.49 },
];

/** Kamień polny — mur z otoczaków, wszystkie odcienie pochodne od colorHex. */
function drawFieldstone(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const id = `fstone${seed}_${Math.round(x * 10)}`;
  const grout = darken(colorHex, 0.44);
  const outline = darken(colorHex, 0.46);
  const edgeLight = lighten(colorHex, 0.12);
  const crackDark = darken(colorHex, 0.25);
  const crackLight = lighten(colorHex, 0.3);
  const shadeDark = darken(colorHex, 0.62);

  // Kolor ziarna szumu jako ułamki RGB (0–1) pochodne od koloru bazowego.
  const hx = colorHex.replace("#", "");
  const grainR = ((parseInt(hx.slice(0, 2), 16) / 255) * 0.42).toFixed(3);
  const grainG = ((parseInt(hx.slice(2, 4), 16) / 255) * 0.42).toFixed(3);
  const grainB = ((parseInt(hx.slice(4, 6), 16) / 255) * 0.42).toFixed(3);

  const sx = w / 400;
  const sy = h / 120;

  let out = `<defs>`;
  out += `<radialGradient id="shade${id}" cx="0.4" cy="0.32" r="0.85">`;
  out += `<stop offset="0" stop-color="#ffffff" stop-opacity="0.3"/>`;
  out += `<stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>`;
  out += `<stop offset="1" stop-color="${shadeDark}" stop-opacity="0.3"/>`;
  out += `</radialGradient>`;
  out += `<filter id="grain${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">`;
  out += `<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="${seed % 97}"/>`;
  out += `<feColorMatrix type="matrix" values="0 0 0 0 ${grainR}  0 0 0 0 ${grainG}  0 0 0 0 ${grainB}  0 0 0 0.22 0"/>`;
  out += `</filter>`;
  out += `<clipPath id="clip${id}"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}"/></clipPath>`;
  out += `</defs>`;

  out += `<g clip-path="url(#clip${id})"><g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})">`;
  out += `<rect width="400" height="120" fill="${grout}"/>`;
  for (const stone of FIELDSTONE_STONES) {
    const fill =
      stone.tone === 0
        ? colorHex
        : stone.tone > 0
          ? lighten(colorHex, stone.tone)
          : darken(colorHex, -stone.tone);
    out += `<path d="${stone.d}" fill="${fill}"/>`;
    out += `<path d="${stone.d}" fill="url(#shade${id})"/>`;
    out += `<path d="${stone.d}" fill="none" stroke="${outline}" stroke-width="1.6" opacity="0.45"/>`;
    out += `<path d="${stone.d}" fill="none" stroke="${edgeLight}" stroke-width="0.9" opacity="0.6" transform="translate(-0.6 -1)"/>`;
  }
  for (const crack of FIELDSTONE_CRACKS) {
    out += `<path d="${crack.d}" fill="none" stroke="${crackDark}" stroke-width="0.8" opacity="${crack.opacity}"/>`;
    out += `<path d="${crack.d}" fill="none" stroke="${crackLight}" stroke-width="0.6" opacity="0.35" transform="translate(0 -1)"/>`;
  }
  out += `<rect width="400" height="120" filter="url(#grain${id})"/>`;
  out += `</g></g>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  return out;
}

/** Rysuje panel wg nowego presetu; null = użyj klasycznego wyglądu. */
function drawPresetPanel(
  patternKey: PanelPresetKey | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string | null {
  switch (patternKey) {
    case "tile-offset":
      return drawTileOffset(x, y, w, h, colorHex, seed);
    case "stone-split":
      return drawStoneSplit(x, y, w, h, colorHex, seed);
    case "brick-small":
      return drawBrickSmall(x, y, w, h, colorHex, seed);
    case "sandstone":
      return drawSandstone(x, y, w, h, colorHex, seed);
    case "sandstone-arch":
      return drawSandstoneArch(x, y, w, h, colorHex, seed);
    case "fieldstone":
      return drawFieldstone(x, y, w, h, colorHex, seed);
    case "clapboard-wide":
      return drawClapboardWide(x, y, w, h, colorHex, seed);
    case "wave-dunes":
      return drawWaveDunes(x, y, w, h, colorHex, seed);
    case "concrete-smooth":
      return drawConcreteSmooth(x, y, w, h, colorHex, seed);
    case "shards":
      return drawShards(x, y, w, h, colorHex, seed);
    case "wave-crest-weave":
      return drawWaveCrestWeave(x, y, w, h, colorHex, seed);
    case "slot-top":
      return drawSlotTop(x, y, w, h, colorHex, seed);
    case "arch-rails":
      return drawArchRails(x, y, w, h, colorHex, seed);
    default:
      return null;
  }
}

/**
 * Filtr przebarwiający własny SVG na wybrany kolor: luminancja piksela
 * jest mapowana na kolor docelowy, więc światłocień projektu zostaje,
 * a barwa podąża za colorHex — tak jak w presetach proceduralnych.
 * Referencja 0.83 = jasność bazowej płyty projektowanej "na szaro".
 */
export function svgTintFilter(colorHex: string, filterId: string): string {
  const n = colorHex.replace("#", "");
  const ref = 0.83;
  const kr = parseInt(n.slice(0, 2), 16) / 255 / ref;
  const kg = parseInt(n.slice(2, 4), 16) / 255 / ref;
  const kb = parseInt(n.slice(4, 6), 16) / 255 / ref;
  const lum = [0.2126, 0.7152, 0.0722];
  const row = (k: number) => lum.map((l) => (l * k).toFixed(4)).join(" ");
  return `<filter id="${filterId}" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="${row(kr)} 0 0  ${row(kg)} 0 0  ${row(kb)} 0 0  0 0 0 1 0"/>
  </filter>`;
}

function drawCustomSvgPanel(
  px: number,
  y: number,
  w: number,
  h: number,
  svgMarkup: string,
  colorHex: string,
): string {
  const inner = wrapCustomSvgForPanel(svgMarkup, px, y, w, h);
  if (!inner) return "";
  const tintId = `csvgTint${Math.round(px * 10)}_${Math.round(y * 10)}`;
  const frameStroke = darken(colorHex, 0.24);
  return (
    `<defs>${svgTintFilter(colorHex, tintId)}</defs>` +
    `<g filter="url(#${tintId})">${inner}</g>` +
    `<rect x="${px.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="${frameStroke}" stroke-width="1" rx="1"/>`
  );
}

function drawConcretePanel(
  px: number,
  y: number,
  w: number,
  h: number,
  role: "standard" | "cap",
  colorHex: string,
  seed: number,
  patternKey?: PanelPresetKey,
  svgMarkup?: string | null,
): string {
  if (svgMarkup?.trim()) {
    return drawCustomSvgPanel(px, y, w, h, svgMarkup, colorHex);
  }

  const preset = drawPresetPanel(patternKey, px, y, w, h, colorHex, seed);
  if (preset !== null) return preset;

  const patId = `concretePat${seed}`;
  const frameInset = w * 0.065;
  const fx = px + frameInset;
  const fw = w - frameInset * 2;
  const arch = isArchPanel(patternKey, role);
  const frameStroke = darken(colorHex, 0.24);
  let out = "";

  if (arch) {
    const riseH = Math.min(Math.max(h * 0.32, 22), h * 0.5);
    const sil = archPanelSilhouette(px, y, w, h, riseH);
    out += `<path d="${sil}" fill="url(#${patId})" stroke="${frameStroke}" stroke-width="1"/>`;
    out += `<path d="${sil}" fill="url(#boardSheen${seed})" opacity="0.55"/>`;

    const grooveY = y + riseH;
    const grooveH = Math.max(2.5, riseH * 0.07);
    out += `<rect x="${fx.toFixed(1)}" y="${grooveY.toFixed(1)}" width="${fw.toFixed(1)}" height="${grooveH.toFixed(1)}" fill="${darken(colorHex, 0.26)}" opacity="0.55"/>`;

    const fy = grooveY + grooveH + frameInset * 0.25;
    const fh = h - (fy - y) - frameInset * 0.5;
    out += drawBoardField(fx, fy, fw, fh, colorHex, seed);
  } else {
    // Panel główny — podniesiona rama + wpuszczone pole z deskami.
    out += `<rect x="${px.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#${patId})" stroke="${frameStroke}" stroke-width="1" rx="1.5"/>`;
    const fy = y + frameInset * 0.6;
    const fh = h - frameInset * 1.2;
    out += drawBoardField(fx, fy, fw, fh, colorHex, seed);
  }

  return out;
}

function drawStackSection(
  px: number,
  y: number,
  sectionW: number,
  fenceH: number,
  heightM: number,
  stackUnits: StackDrawUnit[],
  shadowEdge: string,
  shadowBottom: string,
  colorHex: string,
): string {
  const totalCm = heightM * 100;
  let currentY = y;
  let out = "";

  for (const unit of stackUnits) {
    const blockH = (unit.heightCm / totalCm) * fenceH;

    if (unit.isGap) {
      currentY += blockH;
      continue;
    }

    const gapH = (unit.gapAfterCm / totalCm) * fenceH;

    out += drawConcretePanel(
      px,
      currentY,
      sectionW,
      blockH,
      unit.role ?? "standard",
      colorHex,
      unit.seed ?? 0,
      unit.patternKey,
      unit.svgMarkup,
    );
    out += `<rect x="${(px + sectionW - 2).toFixed(1)}" y="${currentY.toFixed(1)}" width="2" height="${blockH.toFixed(1)}" fill="${shadowEdge}" opacity="0.35"/>`;
    if (blockH > 4) {
      out += `<rect x="${px.toFixed(1)}" y="${(currentY + blockH - 2).toFixed(1)}" width="${sectionW.toFixed(1)}" height="2" fill="${shadowBottom}" opacity="0.3"/>`;
    }
    currentY += blockH + gapH;
  }

  return out;
}

function drawSectionPanels(
  px: number,
  y: number,
  sectionW: number,
  h: number,
  hasSpacer: boolean,
  openness: number,
  shadowEdge: string,
  shadowBottom: string,
  panelTextureUrl?: string | null,
  textureTileCount?: number,
  stackUnits?: StackDrawUnit[],
  heightM?: number,
  colorHex?: string,
): string {
  if (stackUnits && stackUnits.length > 0 && heightM && colorHex) {
    return drawStackSection(
      px,
      y,
      sectionW,
      h,
      heightM,
      stackUnits,
      shadowEdge,
      shadowBottom,
      colorHex,
    );
  }
  const { useStacked, plankCount, slitGap, plankH } = computePlankLayout(
    h,
    hasSpacer,
    openness,
  );
  let out = "";
  if (panelTextureUrl) {
    out += drawTexturedStack(px, y, sectionW, h, panelTextureUrl, textureTileCount ?? 1);
    return out;
  }
  if (useStacked) {
    for (let j = 0; j < plankCount; j++) {
      const py = y + j * (plankH + slitGap);
      out += drawPlank(px, py, sectionW, plankH, shadowEdge, shadowBottom);
    }
  } else {
    out += drawPlank(px, y, sectionW, h, shadowEdge, shadowBottom);
  }
  return out;
}

function drawGateSection(
  px: number,
  y: number,
  panelW: number,
  h: number,
  hasSpacer: boolean,
  openness: number,
  colorHex: string,
  openingTextureUrl?: string | null,
  textureTileCount?: number,
): string {
  if (openingTextureUrl) {
    return drawTexturedStack(
      px,
      y,
      panelW,
      h,
      openingTextureUrl,
      textureTileCount ?? 1,
    );
  }

  const shadowEdge = darken(colorHex, 0.3);
  const shadowBottom = darken(colorHex, 0.2);
  const frameW = Math.max(10, panelW * 0.14);
  const gateW = panelW - frameW * 2;
  const gateX = px + frameW;
  const clearance = Math.max(4, h * 0.04);
  const doorH = h - clearance;
  const doorOpen = Math.min(10, gateW * 0.06);
  const handleMetal = lighten(colorHex, 0.25);

  let out = "";
  out += drawSectionPanels(px, y, frameW, h, hasSpacer, openness, shadowEdge, shadowBottom);
  out += drawSectionPanels(
    px + panelW - frameW,
    y,
    frameW,
    h,
    hasSpacer,
    openness,
    shadowEdge,
    shadowBottom,
  );
  out += drawSectionPanels(
    gateX + doorOpen,
    y,
    gateW - doorOpen,
    doorH,
    hasSpacer,
    openness,
    shadowEdge,
    shadowBottom,
  );
  out += `<line x1="${gateX.toFixed(1)}" y1="${y}" x2="${(gateX + doorOpen).toFixed(1)}" y2="${(y + doorH).toFixed(1)}" stroke="${darken(colorHex, 0.2)}" stroke-width="2" opacity="0.45"/>`;
  out += `<rect x="${(gateX + gateW - 16).toFixed(1)}" y="${(y + doorH * 0.38).toFixed(1)}" width="3" height="${(doorH * 0.22).toFixed(1)}" fill="${darken(colorHex, 0.35)}" rx="1"/>`;
  out += `<circle cx="${(gateX + gateW - 14.5).toFixed(1)}" cy="${(y + doorH * 0.52).toFixed(1)}" r="4" fill="${handleMetal}" stroke="${darken(colorHex, 0.3)}" stroke-width="1"/>`;
  return out;
}

function panelRects(
  x: number,
  y: number,
  w: number,
  h: number,
  gap: number,
  count: number,
  hasSpacer: boolean,
  openness: number,
  colorHex: string,
  openingPanelIndices: number[] = [],
  panelTextureUrl?: string | null,
  openingTextureUrl?: string | null,
  textureTileCount?: number,
  stackUnits?: StackDrawUnit[],
  heightM?: number,
): string {
  const panelW = (w - gap * (count - 1)) / count;
  const shadowEdge = darken(colorHex, 0.3);
  const shadowBottom = darken(colorHex, 0.2);
  const openingSet = new Set(openingPanelIndices);
  let out = "";
  for (let i = 0; i < count; i++) {
    const px = x + i * (panelW + gap);
    if (openingSet.has(i)) {
      out += drawGateSection(
        px,
        y,
        panelW,
        h,
        hasSpacer,
        openness,
        colorHex,
        openingTextureUrl,
        textureTileCount,
      );
    } else {
      out += drawSectionPanels(
        px,
        y,
        panelW,
        h,
        hasSpacer,
        openness,
        shadowEdge,
        shadowBottom,
        panelTextureUrl,
        textureTileCount,
        stackUnits,
        heightM,
        colorHex,
      );
    }
  }
  return out;
}

export function buildFenceSvg(params: FenceRenderParams): string {
  const {
    heightM,
    patternId,
    colorHex,
    postWidthCm,
    hasSpacer = false,
    openness = 0,
    panelCount = 3,
    openingPanelIndices = [],
    transparent = false,
    panelTextureUrl,
    postTextureUrl,
    openingTextureUrl,
    textureTileCount = 1,
    stackUnits,
    postHeightCm,
  } = params;

  const {
    viewW,
    groundY,
    fenceH,
    fenceY,
    postW,
    postTopY,
    postH,
    leftPost,
    rightPost,
    fenceCenterX,
    totalW,
  } = computeFenceGeometry(heightM, postWidthCm, panelCount, postHeightCm);
  const gap = hasSpacer ? 8 + openness * 12 : 2;
  const panelsX = leftPost + postW + 4;
  const panelsW = rightPost - panelsX - 4;
  const sectionPanelW = (panelsW - gap * (panelCount - 1)) / panelCount;

  const postLight = lighten(colorHex, 0.15);
  const postDark = darken(colorHex, 0.25);
  const postTopShade = darken(colorHex, 0.12);
  const footingColor = "#8c8c8c";

  const defs = panelPatternDefs(patternId, colorHex);

  const concreteSeeds = stackUnits?.length
    ? [...new Set(stackUnits.map((u) => String(u.seed ?? 0)))]
    : [];
  const concreteDefsBlock = concreteSeeds
    .map((s) => concreteDefs(colorHex, s))
    .join("\n");
  const postDefs = smoothPostDefs(colorHex);

  // Dimension line positioning
  const dimX = rightPost + postW + 22;
  const dimTopY = fenceY;
  const dimBotY = groundY;
  const dimMidY = (dimTopY + dimBotY) / 2;

  function postFootingPad(px: number): string {
    const padW = postW + 8;
    const padX = px - 4;
    const padH = 8;
    const padY = groundY - padH;
    return `<rect x="${padX}" y="${padY}" width="${padW}" height="${padH}" fill="${footingColor}" rx="1"/>`;
  }

  function renderPost(px: number): string {
    // Płaski szczyt słupka (bez daszka) z delikatną krawędzią górną.
    const topEdge = `<rect x="${px}" y="${postTopY}" width="${postW}" height="2.5" fill="${postTopShade}" opacity="0.5"/>`;
    if (postTextureUrl) {
      const safeUrl = escapeXmlAttr(postTextureUrl);
      return `<!-- Post at ${px.toFixed(0)} -->
    ${postFootingPad(px)}
    <image href="${safeUrl}" x="${px}" y="${postTopY}" width="${postW}" height="${postH}" preserveAspectRatio="none"/>
    ${topEdge}`;
    }
    return `<!-- Post at ${px.toFixed(0)} -->
    ${postFootingPad(px)}
    <rect x="${px}" y="${postTopY}" width="${postW}" height="${postH}" fill="url(#smoothPostFill)" rx="1.5"/>
    <rect x="${px}" y="${postTopY}" width="3" height="${postH}" fill="${postLight}" opacity="0.55" rx="1.5"/>
    <rect x="${px + postW - 4}" y="${postTopY}" width="4" height="${postH}" fill="${postDark}" opacity="0.45"/>
    ${topEdge}`;
  }

  let intermediatePosts = "";
  for (let i = 1; i < panelCount; i++) {
    const dividerCenter = panelsX + i * sectionPanelW + (i - 0.5) * gap;
    const px = dividerCenter - postW / 2;
    intermediatePosts += renderPost(px);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${VIEW_H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Podgląd ogrodzenia">
  <defs>
    ${defs}
    ${concreteDefsBlock}
    ${postDefs}
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#a8d4f0"/>
      <stop offset="40%" stop-color="#c8e8f8"/>
      <stop offset="75%" stop-color="#e8f4fc"/>
      <stop offset="100%" stop-color="#f5f9fd"/>
    </linearGradient>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6dbf3e"/>
      <stop offset="50%" stop-color="#4a9620"/>
      <stop offset="100%" stop-color="#3a7a18"/>
    </linearGradient>
    <filter id="postShadow" x="-20%" y="-10%" width="150%" height="130%">
      <feDropShadow dx="4" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.28"/>
    </filter>
    <filter id="panelShadow" x="-10%" y="-5%" width="130%" height="120%">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.14"/>
    </filter>
  </defs>

  ${
    transparent
      ? `<!-- Transparent scene — tło z kontenera CSS -->
  <ellipse cx="${fenceCenterX}" cy="${groundY + 6}" rx="${(totalW * 0.55).toFixed(1)}" ry="18" fill="#000000" opacity="0.35"/>`
      : `<!-- Sky background -->
  <rect width="${viewW}" height="${VIEW_H}" fill="url(#sky)"/>

  <!-- Ground -->
  <rect x="0" y="${groundY}" width="${viewW}" height="${VIEW_H - groundY}" fill="url(#grass)"/>
  <rect x="0" y="${groundY + 10}" width="${viewW}" height="6" fill="#3a7a18" opacity="0.4"/>
  <rect x="0" y="${groundY + 22}" width="${viewW}" height="8" fill="#3a7a18" opacity="0.2"/>

  <!-- Ground shadow ellipse -->
  <ellipse cx="${fenceCenterX}" cy="${groundY + 4}" rx="${(totalW * 0.5).toFixed(1)}" ry="14" fill="#000000" opacity="0.08"/>`
  }

  <!-- Panels group -->
  <g filter="url(#panelShadow)">
    ${panelRects(
      panelsX,
      fenceY,
      panelsW,
      fenceH,
      gap,
      panelCount,
      hasSpacer,
      openness,
      colorHex,
      openingPanelIndices,
      panelTextureUrl,
      openingTextureUrl,
      textureTileCount,
      stackUnits,
      heightM,
    )}
  </g>

  <!-- Posts group -->
  <g filter="url(#postShadow)">
    ${renderPost(leftPost)}
    ${intermediatePosts}
    ${renderPost(rightPost)}
  </g>

  ${
    transparent
      ? ""
      : `<!-- Dimension line -->
  <line x1="${dimX}" y1="${dimTopY}" x2="${dimX}" y2="${dimBotY}" stroke="#ff3131" stroke-width="1.5" stroke-dasharray="4 3"/>
  <line x1="${dimX - 5}" y1="${dimTopY}" x2="${dimX + 5}" y2="${dimTopY}" stroke="#ff3131" stroke-width="2"/>
  <line x1="${dimX - 5}" y1="${dimBotY}" x2="${dimX + 5}" y2="${dimBotY}" stroke="#ff3131" stroke-width="2"/>
  <text x="${dimX + 9}" y="${dimMidY + 5}" font-size="13" font-weight="700" fill="#ff3131" font-family="system-ui,sans-serif">${heightM.toFixed(2).replace(".", ",")} m</text>`
  }
</svg>`;
}
