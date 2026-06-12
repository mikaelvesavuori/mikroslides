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
    .filter((element) => rectsIntersect(rect, rotatedElementBounds(element)))
    .map((element) => element.id);
}

export function pointInElementBounds(point: PercentPoint, element: SlideElement) {
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const radians = (-element.rotation * Math.PI) / 180;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const localX = dx * Math.cos(radians) - dy * Math.sin(radians) + centerX;
  const localY = dx * Math.sin(radians) + dy * Math.cos(radians) + centerY;

  return (
    localX >= element.x &&
    localX <= element.x + element.width &&
    localY >= element.y &&
    localY <= element.y + element.height
  );
}

function rotatedElementBounds(element: SlideElement): PercentRect {
  if (element.rotation === 0) {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const radians = (element.rotation * Math.PI) / 180;
  const corners = [
    { x: element.x, y: element.y },
    { x: element.x + element.width, y: element.y },
    { x: element.x + element.width, y: element.y + element.height },
    { x: element.x, y: element.y + element.height },
  ].map((point) => rotatePoint(point, centerX, centerY, radians));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

function rotatePoint(point: PercentPoint, centerX: number, centerY: number, radians: number) {
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians) + centerX,
    y: dx * Math.sin(radians) + dy * Math.cos(radians) + centerY,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
