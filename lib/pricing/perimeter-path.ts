import type { GatePosition } from "@/lib/configurator/state";
import type { ImageLayout, Point2D } from "@/lib/pricing/geometry";
import { normalizedToPx, pxToMeters } from "@/lib/pricing/geometry";

export type PerimeterProjection = {
  point: Point2D;
  /** Pozycja wzdłuż obwodu w metrach (od pierwszego wierzchołka). */
  arcM: number;
  /** Znormalizowana pozycja 0–1 wzdłuż obwodu. */
  arcT: number;
  segmentIndex: number;
};

function segmentLengthPx(
  a: Point2D,
  b: Point2D,
  layout: ImageLayout,
): number {
  const ap = normalizedToPx(a, layout.width, layout.height);
  const bp = normalizedToPx(b, layout.width, layout.height);
  return Math.hypot(bp.x - ap.x, bp.y - ap.y);
}

function closestPointOnSegment(
  p: Point2D,
  a: Point2D,
  b: Point2D,
): { point: Point2D; t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return { point: a, t: 0 };
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq),
  );
  return {
    point: { x: a.x + abx * t, y: a.y + aby * t },
    t,
  };
}

/** Długość zamkniętego obrysu w metrach. */
export function closedPerimeterLengthM(
  points: Point2D[],
  layout: ImageLayout,
  pxPerMeter: number,
): number {
  if (points.length < 3 || pxPerMeter <= 0) return 0;
  let totalPx = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    totalPx += segmentLengthPx(a, b, layout);
  }
  return pxToMeters(totalPx, pxPerMeter);
}

/** Rzut punktu na najbliższy odcinek zamkniętego obrysu. */
export function projectPointOntoClosedPerimeter(
  click: Point2D,
  points: Point2D[],
  layout: ImageLayout,
  pxPerMeter: number,
  maxDistancePx = 24,
): PerimeterProjection | null {
  if (points.length < 3 || pxPerMeter <= 0 || layout.width <= 0) return null;

  const clickPx = normalizedToPx(click, layout.width, layout.height);
  let totalPx = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const len = segmentLengthPx(points[i]!, points[(i + 1) % points.length]!, layout);
    segLens.push(len);
    totalPx += len;
  }
  if (totalPx <= 0) return null;

  let best: PerimeterProjection | null = null;
  let bestDist = maxDistancePx;
  let arcPx = 0;

  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const segLenPx = segLens[i]!;
    const { point, t } = closestPointOnSegment(click, a, b);
    const pointPx = normalizedToPx(point, layout.width, layout.height);
    const dist = Math.hypot(pointPx.x - clickPx.x, pointPx.y - clickPx.y);

    if (dist <= bestDist) {
      bestDist = dist;
      const arcAtPointPx = arcPx + segLenPx * t;
      best = {
        point,
        arcM: pxToMeters(arcAtPointPx, pxPerMeter),
        arcT: arcAtPointPx / totalPx,
        segmentIndex: i,
      };
    }
    arcPx += segLenPx;
  }

  return best;
}

/** Punkt na obrysie dla znormalizowanej pozycji 0–1. */
export function pointAtArcT(
  arcT: number,
  points: Point2D[],
  layout: ImageLayout,
): Point2D {
  if (points.length < 3) return { x: 0, y: 0 };

  let totalPx = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const len = segmentLengthPx(points[i]!, points[(i + 1) % points.length]!, layout);
    segLens.push(len);
    totalPx += len;
  }

  const targetPx = Math.max(0, Math.min(1, arcT)) * totalPx;
  let walked = 0;
  for (let i = 0; i < points.length; i++) {
    const segLen = segLens[i]!;
    if (walked + segLen >= targetPx || i === points.length - 1) {
      const t = segLen > 0 ? (targetPx - walked) / segLen : 0;
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }
    walked += segLen;
  }
  return points[0]!;
}

/** Krótszy odcinek obwodu między dwoma pozycjami arcT (0–1). */
export function arcSpanM(
  arcTStart: number,
  arcTEnd: number,
  perimeterM: number,
): number {
  if (perimeterM <= 0) return 0;
  const a = Math.max(0, Math.min(1, arcTStart));
  const b = Math.max(0, Math.min(1, arcTEnd));
  const direct = Math.abs(b - a) * perimeterM;
  const wrap = perimeterM - direct;
  return Math.min(direct, wrap);
}

/** Mapuje punkt na obrysie na pozycję furtki w podglądzie (lewa/środek/prawa). */
export function gatePositionFromPoint(point: Point2D): GatePosition {
  if (point.x < 33.33) return "left";
  if (point.x < 66.66) return "center";
  return "right";
}

/** Punkty wzdłuż odcinka obwodu między arcT (do rysowania bramy). */
export function perimeterSlicePoints(
  arcTStart: number,
  arcTEnd: number,
  points: Point2D[],
  layout: ImageLayout,
): Point2D[] {
  if (points.length < 3) return [];

  const spanT = arcSpanM(arcTStart, arcTEnd, 1);
  const steps = Math.max(2, Math.ceil(spanT * 40));
  const start = Math.max(0, Math.min(1, arcTStart));
  const end = Math.max(0, Math.min(1, arcTEnd));
  const direct = Math.abs(end - start);
  const useWrap = direct > 0.5;

  const result: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    let t: number;
    if (!useWrap) {
      t = start + (end - start) * frac;
    } else {
      const forward = (1 - start) + end;
      const pos = start + forward * frac;
      t = pos >= 1 ? pos - 1 : pos;
    }
    result.push(pointAtArcT(t, points, layout));
  }
  return result;
}
