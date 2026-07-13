import type { PanelPresetKey, PatternId } from "./patterns";
import { isArchPanel } from "./patterns";

export type StackDrawUnit = {
  textureUrl?: string | null;
  heightCm: number;
  gapAfterCm: number;
  isGap?: boolean;
  role?: "standard" | "cap";
  patternKey?: PanelPresetKey;
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

/** 1. Deska pełna — gładki beton z poziomym „słojem” szalunku. */
function drawPlankSmooth(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 101);
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#concretePat${seed})" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#boardSheen${seed})" opacity="0.5"/>`;
  const lines = 3;
  for (let i = 1; i <= lines; i++) {
    const yy = y + (h * i) / (lines + 1) + (rand() - 0.5) * h * 0.1;
    const seg = 5;
    let d = `M ${(x + 3).toFixed(1)} ${yy.toFixed(1)}`;
    for (let s = 0; s < seg; s++) {
      const ex = x + 3 + ((w - 6) * (s + 1)) / seg;
      const cy = yy + (rand() - 0.5) * 2.4;
      d += ` Q ${(x + 3 + ((w - 6) * (s + 0.5)) / seg).toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${yy.toFixed(1)}`;
    }
    out += `<path d="${d}" fill="none" stroke="${darken(colorHex, 0.2)}" stroke-width="0.7" opacity="0.3"/>`;
  }
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="1.5" fill="${lighten(colorHex, 0.18)}" opacity="0.5"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${(y + h - 2.5).toFixed(1)}" width="${w.toFixed(1)}" height="2.5" fill="${darken(colorHex, 0.3)}" opacity="0.45"/>`;
  return out;
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

/** 3. Lamele poziome — gęste rzędy nachodzących na siebie desek. */
function drawLamelleDense(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rows = Math.min(10, Math.max(4, Math.round(h / 13)));
  const rowH = h / rows;
  let out = "";
  for (let r = 0; r < rows; r++) {
    out += bevelRow(x, y + r * rowH, w, rowH, colorHex, seed, 0.24);
  }
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
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

/** 8. Plecionka ażurowa — belki z prześwitami i kamiennymi wstawkami. */
function drawWeaveOpen(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 808);
  const rows = Math.min(7, Math.max(3, Math.round(h / 14)));
  const unitH = h / rows;
  const barH = unitH * 0.62;
  const gapH = unitH - barH;
  const segs = 5;
  const segW = w / segs;
  let out = "";
  for (let r = 0; r < rows; r++) {
    const by = y + r * unitH;
    // Prześwity/wstawki nad belką (poza pierwszym rzędem).
    if (r > 0) {
      const gy = by - gapH;
      for (let k = 0; k < segs; k++) {
        const isInsert = (Math.floor(rand() * 10) + r + k) % 3 === 0;
        const gx = x + k * segW;
        if (isInsert) {
          out += `<rect x="${(gx + 1).toFixed(1)}" y="${gy.toFixed(1)}" width="${(segW - 2).toFixed(1)}" height="${gapH.toFixed(1)}" fill="${lighten(colorHex, 0.28)}"/>`;
          const jointX = gx + segW * (0.3 + rand() * 0.4);
          out += `<line x1="${(gx + 1).toFixed(1)}" y1="${(gy + gapH / 2).toFixed(1)}" x2="${(gx + segW - 1).toFixed(1)}" y2="${(gy + gapH / 2).toFixed(1)}" stroke="${darken(colorHex, 0.28)}" stroke-width="0.8" opacity="0.6"/>`;
          out += `<line x1="${jointX.toFixed(1)}" y1="${gy.toFixed(1)}" x2="${jointX.toFixed(1)}" y2="${(gy + gapH / 2).toFixed(1)}" stroke="${darken(colorHex, 0.28)}" stroke-width="0.8" opacity="0.5"/>`;
          out += `<rect x="${(gx + 1).toFixed(1)}" y="${gy.toFixed(1)}" width="${(segW - 2).toFixed(1)}" height="2" fill="${darken(colorHex, 0.35)}" opacity="0.3"/>`;
          out += `<rect x="${(gx + 1).toFixed(1)}" y="${gy.toFixed(1)}" width="${(segW - 2).toFixed(1)}" height="${gapH.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.34)}" stroke-width="0.8" opacity="0.65"/>`;
        }
        // Brak wstawki = prawdziwy prześwit (tło sceny widoczne).
      }
    }
    out += `<rect x="${x.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="${barH.toFixed(1)}" fill="url(#concretePat${seed})" rx="2"/>`;
    out += `<rect x="${x.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="${barH.toFixed(1)}" fill="url(#boardSheen${seed})" rx="2"/>`;
    out += `<rect x="${x.toFixed(1)}" y="${(by + barH - 2).toFixed(1)}" width="${w.toFixed(1)}" height="2" fill="${darken(colorHex, 0.4)}" opacity="0.5" rx="1"/>`;
    out += `<rect x="${x.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="${barH.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.32)}" stroke-width="0.8" opacity="0.6" rx="2"/>`;
  }
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

/** Moduł kamienia polnego (współrzędne 0–1, zaokrąglone kształty). */
/** Zaokrąglony, nieregularny obrys kamienia polnego — gładka pętla kwadratowych krzywych. */
function fieldstoneBlobPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rand: () => number,
): string {
  const n = 7 + Math.floor(rand() * 3);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + (rand() - 0.5) * 0.55) / n) * Math.PI * 2;
    const f = 0.74 + rand() * 0.32;
    pts.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]);
  }
  const mid = (p: [number, number], q: [number, number]): [number, number] => [
    (p[0] + q[0]) / 2,
    (p[1] + q[1]) / 2,
  ];
  const start = mid(pts[n - 1], pts[0]);
  let d = `M ${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    d += ` Q ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

/** Gęsto upakowane kamienie polne na tle ciemnej fugi (do przycięcia clipem panelu). */
function drawFieldstoneStones(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
  salt: number,
): string {
  const rand = mulberry32(seed + salt);
  const targetSize = Math.max(h / 3.1, 13);
  const rows = Math.max(2, Math.round(h / targetSize));
  const cols = Math.max(3, Math.round(w / (targetSize * 1.25)));
  const cw = w / cols;
  const ch = h / rows;
  const joint = darken(colorHex, 0.38);
  const glint = lighten(colorHex, 0.2);
  let out = "";
  for (let r = 0; r < rows; r++) {
    const rowShift = (r % 2 === 0 ? -1 : 1) * cw * (0.1 + rand() * 0.14);
    for (let c = 0; c <= cols; c++) {
      const cx = x + (c + 0.5) * cw + rowShift + (rand() - 0.5) * cw * 0.22;
      const cy = y + (r + 0.5) * ch + (rand() - 0.5) * ch * 0.18;
      const rx = cw * (0.55 + rand() * 0.14);
      const ry = ch * (0.52 + rand() * 0.13);
      const d = fieldstoneBlobPath(cx, cy, rx, ry, rand);
      const tone =
        rand() > 0.42
          ? lighten(colorHex, 0.06 + rand() * 0.1)
          : darken(colorHex, 0.03 + rand() * 0.07);
      out += `<path d="${d}" fill="url(#concretePat${seed})"/>`;
      out += `<path d="${d}" fill="${tone}" opacity="0.32"/>`;
      out += `<path d="${d}" fill="none" stroke="${glint}" stroke-width="1.4" opacity="0.3" transform="translate(-0.7 -1.1)"/>`;
      out += `<path d="${d}" fill="none" stroke="${joint}" stroke-width="1.8" opacity="0.65" stroke-linejoin="round"/>`;
    }
  }
  return out;
}

/** Kamień — panel główny: rzut kamieni polnych z ciemną fugą i gładką ramką. */
function drawFieldstone(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const frame = Math.min(Math.max(Math.min(w, h) * 0.05, 2.5), 6);
  const ix = x + frame;
  const iy = y + frame;
  const iw = w - frame * 2;
  const ih = h - frame * 2;
  const grout = darken(colorHex, 0.3);
  const clipId = `fieldPan${seed}_${Math.round(x * 10)}_${Math.round(y * 10)}`;

  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#concretePat${seed})" rx="1"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${lighten(colorHex, 0.05)}" opacity="0.25" rx="1"/>`;
  out += `<defs><clipPath id="${clipId}"><rect x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}"/></clipPath></defs>`;
  out += `<rect x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" fill="${grout}"/>`;
  out += `<rect x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" fill="url(#concretePat${seed})" opacity="0.4"/>`;
  out += `<g clip-path="url(#${clipId})">`;
  out += drawFieldstoneStones(ix, iy, iw, ih, colorHex, seed, 603);
  out += `</g>`;
  out += `<rect x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.3)}" stroke-width="1" opacity="0.7"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="${darken(colorHex, 0.28)}" stroke-width="1" rx="1"/>`;
  return out;
}

/** Kamień górny — nieregularna górna krawędź podążająca za konturami kamieni. */
function drawFieldstoneCap(
  x: number,
  y: number,
  w: number,
  h: number,
  colorHex: string,
  seed: number,
): string {
  const rand = mulberry32(seed + 704);
  const N = 40;
  const riseH = Math.min(Math.max(h * 0.28, 18), h * 0.48);
  const bottom = y + h;

  let crest = "";
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const px = x + t * w;
    const dome = Math.sin(Math.PI * t);
    const jitter = (rand() - 0.5) * riseH * 0.12 * dome;
    const py = y + riseH - dome * riseH * 0.88 + jitter;
    crest += `${i === 0 ? "M" : " L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  const sil = `${crest} L ${(x + w).toFixed(1)} ${bottom.toFixed(1)} L ${x.toFixed(1)} ${bottom.toFixed(1)} Z`;
  const clipId = `fieldCap${seed}_${Math.round(x * 10)}`;
  const grout = darken(colorHex, 0.34);
  const frameStroke = darken(colorHex, 0.24);

  let out = `<defs><clipPath id="${clipId}"><path d="${sil}"/></clipPath></defs>`;
  out += `<g clip-path="url(#${clipId})">`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${grout}"/>`;
  out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#concretePat${seed})" opacity="0.35"/>`;
  out += drawFieldstoneStones(x, y, w, h, colorHex, seed, 705);
  out += `</g>`;
  out += `<path d="${sil}" fill="none" stroke="${frameStroke}" stroke-width="1"/>`;
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
    case "plank-smooth":
      return drawPlankSmooth(x, y, w, h, colorHex, seed);
    case "tile-offset":
      return drawTileOffset(x, y, w, h, colorHex, seed);
    case "lamelle-dense":
      return drawLamelleDense(x, y, w, h, colorHex, seed);
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
    case "fieldstone-cap":
      return drawFieldstoneCap(x, y, w, h, colorHex, seed);
    case "clapboard-wide":
      return drawClapboardWide(x, y, w, h, colorHex, seed);
    case "wave-dunes":
      return drawWaveDunes(x, y, w, h, colorHex, seed);
    case "concrete-smooth":
      return drawConcreteSmooth(x, y, w, h, colorHex, seed);
    case "weave-open":
      return drawWeaveOpen(x, y, w, h, colorHex, seed);
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

function drawConcretePanel(
  px: number,
  y: number,
  w: number,
  h: number,
  role: "standard" | "cap",
  colorHex: string,
  seed: number,
  patternKey?: PanelPresetKey,
): string {
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
