import type { SlideElement } from "../index.js";

export type PercentRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PercentPoint = {
  x: number;
  y: number;
};

export type CanvasRectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function canvasPointPercent(clientX: number, clientY: number, rect: CanvasRectLike) {
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
  };
}

export function marqueeRectFromPoints(start: PercentPoint, end: PercentPoint): PercentRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function rectsIntersect(left: PercentRect, right: PercentRect) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function elementIdsInRect(rect: PercentRect, elements: SlideElement[]) {
  if (rect.width < 0.1 || rect.height < 0.1) {
    return [];
  }

  return elements
    .filter((element) =>
      rectsIntersect(rect, {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      }),
    )
    .map((element) => element.id);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
