import type { SlideElement } from "../index.js";
import { marqueeRectFromPoints, type PercentRect } from "./interactionGeometry.js";

export type CanvasRectSize = Pick<DOMRectReadOnly, "height" | "width">;
export type CanvasRect = Pick<DOMRectReadOnly, "height" | "left" | "top" | "width">;
type PercentPoint = { x: number; y: number };

export type DragState = {
  elementId: string;
  mode: "move" | "resize" | "rotate";
  kind: SlideElement["kind"];
  startClientX: number;
  startClientY: number;
  startCenterClientX: number;
  startCenterClientY: number;
  startAngle: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
  selectedStarts: Array<{
    id: string;
    rotation: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
};

export type GeometryUpdate = {
  id: string;
  patch: Partial<Pick<SlideElement, "height" | "rotation" | "width" | "x" | "y">>;
};

export type SelectionMarqueeState = {
  pointerId: number;
  startX: number;
  startY: number;
  additive: boolean;
  originIds: string[];
  box: HTMLElement;
};

export type CanvasPointerDownAction =
  | { kind: "edit-text"; element: SlideElement }
  | { kind: "ignore" }
  | { kind: "start-drag"; element: SlideElement; mode: DragState["mode"] }
  | { kind: "start-marquee" }
  | { elementId: string; kind: "toggle-selection-off" };

export function canvasPointerDownAction(options: {
  button: number;
  ctrlKey: boolean;
  detail: number;
  element: SlideElement | null;
  elementId: string | null;
  isEditableTarget: boolean;
  isRotate?: boolean;
  isResize: boolean;
  isSelected: boolean;
  multiSelect: boolean;
  shiftKey?: boolean;
}): CanvasPointerDownAction {
  if (options.button !== 0 || options.ctrlKey || options.isEditableTarget) {
    return { kind: "ignore" };
  }

  if (!options.elementId) {
    return { kind: "start-marquee" };
  }

  if (!options.element) {
    return { kind: "ignore" };
  }

  if (
    !options.isRotate &&
    !options.isResize &&
    !options.element.locked &&
    (options.element.kind === "text" || options.element.kind === "shape") &&
    options.detail >= 2
  ) {
    return { element: options.element, kind: "edit-text" };
  }

  if (options.multiSelect && options.isSelected && !options.isResize && !options.shiftKey) {
    return { elementId: options.elementId, kind: "toggle-selection-off" };
  }

  return {
    element: options.element,
    kind: "start-drag",
    mode: options.isRotate ? "rotate" : options.isResize ? "resize" : "move",
  };
}

export function createDragState(options: {
  clientX: number;
  clientY: number;
  canvasRect?: CanvasRect;
  element: SlideElement;
  mode: DragState["mode"];
  selectedElements: SlideElement[];
}): DragState {
  const center = elementCenterClientPoint(options.element, options.canvasRect);
  return {
    elementId: options.element.id,
    mode: options.mode,
    kind: options.element.kind,
    startClientX: options.clientX,
    startClientY: options.clientY,
    startCenterClientX: center.x,
    startCenterClientY: center.y,
    startAngle: angleBetweenPoints(center.x, center.y, options.clientX, options.clientY),
    startWidth: options.element.width,
    startHeight: options.element.height,
    aspectRatio: options.element.width / Math.max(options.element.height, 1),
    selectedStarts: options.selectedElements.map((item) => ({
      id: item.id,
      rotation: item.rotation,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    })),
  };
}

export function dragGeometryUpdates(
  dragState: DragState,
  clientX: number,
  clientY: number,
  canvasRect: CanvasRectSize,
  shiftKey: boolean,
): GeometryUpdate[] {
  const dx = ((clientX - dragState.startClientX) / Math.max(canvasRect.width, 1)) * 100;
  const dy = ((clientY - dragState.startClientY) / Math.max(canvasRect.height, 1)) * 100;

  if (dragState.mode === "move") {
    const constrainedDelta =
      shiftKey && (dx !== 0 || dy !== 0)
        ? constrainMoveDelta(
            dx,
            dy,
            clientX - dragState.startClientX,
            clientY - dragState.startClientY,
          )
        : { dx, dy };
    return dragState.selectedStarts.map((item) => ({
      id: item.id,
      patch: {
        x: roundPercent(item.x + constrainedDelta.dx),
        y: roundPercent(item.y + constrainedDelta.dy),
      },
    }));
  }

  if (dragState.mode === "rotate") {
    const currentAngle = angleBetweenPoints(
      dragState.startCenterClientX,
      dragState.startCenterClientY,
      clientX,
      clientY,
    );
    const delta = currentAngle - dragState.startAngle;
    return dragState.selectedStarts.map((item) => ({
      id: item.id,
      patch: {
        rotation: roundDegrees(
          shiftKey ? snapDegrees(item.rotation + delta, 15) : item.rotation + delta,
        ),
      },
    }));
  }

  let nextWidth = Math.max(1, dragState.startWidth + dx);
  let nextHeight = Math.max(1, dragState.startHeight + dy);

  if (shiftKey && dragState.kind === "image") {
    if (Math.abs(clientX - dragState.startClientX) >= Math.abs(clientY - dragState.startClientY)) {
      nextHeight = nextWidth / Math.max(dragState.aspectRatio, 0.01);
    } else {
      nextWidth = nextHeight * dragState.aspectRatio;
    }
  }

  return [
    {
      id: dragState.elementId,
      patch: {
        width: roundPercent(nextWidth),
        height: roundPercent(nextHeight),
      },
    },
  ];
}

export function createSelectionMarqueeState(options: {
  additive: boolean;
  box: HTMLElement;
  originIds: string[];
  pointerId: number;
  start: PercentPoint;
}): SelectionMarqueeState {
  return {
    pointerId: options.pointerId,
    startX: options.start.x,
    startY: options.start.y,
    additive: options.additive,
    originIds: options.originIds,
    box: options.box,
  };
}

export function selectionMarqueeRect(state: SelectionMarqueeState, point: PercentPoint) {
  return marqueeRectFromPoints({ x: state.startX, y: state.startY }, point);
}

export function nextSelectionFromMarquee(state: SelectionMarqueeState, matchedIds: string[]) {
  return state.additive ? [...state.originIds, ...matchedIds] : matchedIds;
}

export function setSelectionMarqueeBox(box: HTMLElement, rect: PercentRect) {
  box.style.setProperty("--marquee-x", String(rect.x));
  box.style.setProperty("--marquee-y", String(rect.y));
  box.style.setProperty("--marquee-w", String(rect.width));
  box.style.setProperty("--marquee-h", String(rect.height));
}

export function syncCanvasSelectionAttributes(canvas: HTMLElement, selectedElementIds: string[]) {
  const selected = new Set(selectedElementIds);
  for (const node of canvas.querySelectorAll<HTMLElement>("[data-element-id]")) {
    const elementId = node.dataset.elementId;
    node.dataset.selected = String(Boolean(elementId && selected.has(elementId)));
  }
}

export function trySetPointerCapture(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Safari can be fussy if capture is requested after a synthetic pointer transfer.
  }
}

export function tryReleasePointerCapture(element: HTMLElement, pointerId: number) {
  try {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {
    // Capture may already be released by the browser on pointerup.
  }
}

export function eventTargetElement(event: Event) {
  if (event.target instanceof HTMLElement) {
    return event.target;
  }

  const parentElement = (event.target as { parentElement?: unknown } | null)?.parentElement;
  return parentElement instanceof HTMLElement ? parentElement : null;
}

export function canvasElementIdFromTarget(target: HTMLElement | null) {
  return target?.closest<HTMLElement>("[data-element-id]")?.dataset.elementId;
}

export function isEditableCanvasTarget(target: HTMLElement | null) {
  return Boolean(target?.closest('[contenteditable="true"], [contenteditable="plaintext-only"]'));
}

export function textElementIdFromTarget(target: HTMLElement | null) {
  const textEditor = target?.closest<HTMLElement>("[data-text-editor]");
  const elementNode = target?.closest<HTMLElement>(
    '[data-element-id][data-kind="text"], [data-element-id][data-kind="shape"]',
  );
  return textEditor?.dataset.textEditor ?? elementNode?.dataset.elementId;
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function roundDegrees(value: number) {
  return Math.round(normalizeDegrees(value) * 10) / 10;
}

function normalizeDegrees(value: number) {
  const normalized = (((((Number.isFinite(value) ? value : 0) + 180) % 360) + 360) % 360) - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function snapDegrees(value: number, increment: number) {
  return Math.round(value / increment) * increment;
}

function angleBetweenPoints(centerX: number, centerY: number, clientX: number, clientY: number) {
  return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
}

function elementCenterClientPoint(element: SlideElement, canvasRect: CanvasRect | undefined) {
  if (!canvasRect) {
    return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
  }

  return {
    x: canvasRect.left + ((element.x + element.width / 2) / 100) * canvasRect.width,
    y: canvasRect.top + ((element.y + element.height / 2) / 100) * canvasRect.height,
  };
}

function constrainMoveDelta(dx: number, dy: number, pixelDx: number, pixelDy: number) {
  return Math.abs(pixelDx) >= Math.abs(pixelDy) ? { dx, dy: 0 } : { dx: 0, dy };
}
