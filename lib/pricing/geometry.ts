export type Point2D = { x: number; y: number };

export type Line2D = { x1: number; y1: number; x2: number; y2: number };

export type ImageLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function getObjectContainLayout(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): ImageLayout {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }

  const imageAspect = imageWidth / imageHeight;
  const containerAspect = containerWidth / containerHeight;

  if (containerAspect > imageAspect) {
    const height = containerHeight;
    const width = height * imageAspect;
    return {
      left: (containerWidth - width) / 2,
      top: 0,
      width,
      height,
    };
  }

  const width = containerWidth;
  const height = width / imageAspect;
  return {
    left: 0,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}

export function clientToNormalizedInLayout(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  layout: ImageLayout,
): Point2D | null {
  const x = clientX - containerRect.left - layout.left;
  const y = clientY - containerRect.top - layout.top;
  if (x < 0 || y < 0 || x > layout.width || y > layout.height) {
    return null;
  }
  return {
    x: (x / layout.width) * 100,
    y: (y / layout.height) * 100,
  };
}

export function findNearestPointIndex(
  click: Point2D,
  points: Point2D[],
  layout: ImageLayout,
  thresholdPx = 14,
): number | null {
  if (points.length === 0 || layout.width <= 0) return null;

  const clickPx = normalizedToPx(click, layout.width, layout.height);
  let bestIndex: number | null = null;
  let bestDist = thresholdPx;

  points.forEach((point, index) => {
    const px = normalizedToPx(point, layout.width, layout.height);
    const dist = Math.hypot(px.x - clickPx.x, px.y - clickPx.y);
    if (dist <= bestDist) {
      bestDist = dist;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function lineLengthPx(line: Line2D): number {
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}

export function polygonPerimeterPx(points: Point2D[], closed: boolean): number {
  if (points.length < 2) return 0;
  let total = 0;
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

export function pxToMeters(px: number, pxPerMeter: number): number {
  if (pxPerMeter <= 0) return 0;
  return px / pxPerMeter;
}

export function computePxPerMeter(linePx: number, realLengthM: number): number | null {
  if (realLengthM <= 0 || linePx <= 0) return null;
  return linePx / realLengthM;
}

export function imageToNormalized(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): Point2D {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

export function normalizedToPx(
  point: Point2D,
  width: number,
  height: number,
): Point2D {
  return {
    x: (point.x / 100) * width,
    y: (point.y / 100) * height,
  };
}

export function lineLengthNormalizedPx(
  line: Line2D,
  layout: ImageLayout,
): number {
  const a = normalizedToPx({ x: line.x1, y: line.y1 }, layout.width, layout.height);
  const b = normalizedToPx({ x: line.x2, y: line.y2 }, layout.width, layout.height);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function polygonPerimeterNormalizedPx(
  points: Point2D[],
  layout: ImageLayout,
  closed: boolean,
): number {
  const pxPoints = points.map((p) =>
    normalizedToPx(p, layout.width, layout.height),
  );
  return polygonPerimeterPx(pxPoints, closed);
}
