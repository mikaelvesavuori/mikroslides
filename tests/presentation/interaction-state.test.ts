import {
  createImageElement,
  createShapeElement,
  createTextElement,
  MikroDeck,
} from "../../src/index.js";
import {
  canvasPointerDownAction,
  createDragState,
  createSelectionMarqueeState,
  dragGeometryUpdates,
  nextSelectionFromMarquee,
  selectionMarqueeRect,
} from "../../src/presentation/canvasInteraction.js";
import {
  canvasContextSelectionAction,
  constrainedMenuPosition,
  contextMenuActionFromEvent,
  isContextActionDisabled,
  runContextMenuAction,
} from "../../src/presentation/contextMenu.js";
import {
  canvasPointPercent,
  elementIdsInRect,
  marqueeRectFromPoints,
  pointInElementBounds,
  rectsIntersect,
} from "../../src/presentation/interactionGeometry.js";
import {
  isMultiSelectEvent,
  nextInteractionSelection,
  selectionForSlide,
} from "../../src/presentation/selection.js";
import { reorderSlides } from "../../src/presentation/slideReorder.js";

describe("interaction helpers", () => {
  it("keeps selection behavior deterministic", () => {
    expect(nextInteractionSelection(["a"], "a", true)).toEqual([]);
    expect(nextInteractionSelection(["a"], "b", true)).toEqual(["b", "a"]);
    expect(nextInteractionSelection(["a", "b"], "b", false)).toEqual(["b", "a"]);
    expect(isMultiSelectEvent({ ctrlKey: false, metaKey: true, shiftKey: false })).toBe(true);
  });

  it("prunes selection to the active slide", () => {
    expect(selectionForSlide(["a", "missing"], [createTextElement({ id: "a" })])).toEqual(["a"]);
  });

  it("starts editing shape labels on double click", () => {
    const shape = createShapeElement({ id: "shape" });

    expect(
      canvasPointerDownAction({
        button: 0,
        ctrlKey: false,
        detail: 2,
        element: shape,
        elementId: shape.id,
        isEditableTarget: false,
        isResize: false,
        isSelected: true,
        multiSelect: false,
      }),
    ).toEqual({ element: shape, kind: "edit-text" });
  });

  it("computes marquee geometry and intersections", () => {
    const point = canvasPointPercent(60, 80, { left: 10, top: 20, width: 100, height: 200 });
    expect(point).toEqual({ x: 50, y: 30 });
    expect(marqueeRectFromPoints({ x: 50, y: 30 }, { x: 20, y: 70 })).toEqual({
      x: 20,
      y: 30,
      width: 30,
      height: 40,
    });
    expect(
      rectsIntersect(
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 25, y: 25, width: 10, height: 10 },
      ),
    ).toBe(true);
  });

  it("finds slide elements inside a marquee rectangle", () => {
    expect(
      elementIdsInRect({ x: 0, y: 0, width: 40, height: 40 }, [
        createTextElement({ id: "inside", x: 10, y: 10, width: 10, height: 10 }),
        createTextElement({ id: "outside", x: 70, y: 70, width: 10, height: 10 }),
      ]),
    ).toEqual(["inside"]);
  });

  it("checks points against rotated element bounds", () => {
    const element = createTextElement({
      height: 20,
      id: "rotated",
      rotation: 45,
      width: 20,
      x: 40,
      y: 40,
    });

    expect(pointInElementBounds({ x: 50, y: 50 }, element)).toBe(true);
    expect(pointInElementBounds({ x: 40, y: 40 }, element)).toBe(false);
  });

  it("computes drag geometry for moving multiple selected elements", () => {
    const first = createTextElement({ id: "first", x: 10, y: 15, width: 20, height: 10 });
    const second = createTextElement({ id: "second", x: 30, y: 25, width: 20, height: 10 });
    const dragState = createDragState({
      clientX: 100,
      clientY: 100,
      element: first,
      mode: "move",
      selectedElements: [first, second],
    });

    expect(dragGeometryUpdates(dragState, 150, 130, { width: 500, height: 300 }, false)).toEqual([
      { id: "first", patch: { x: 20, y: 25 } },
      { id: "second", patch: { x: 40, y: 35 } },
    ]);
  });

  it("constrains move geometry to the dominant pointer axis while shift is held", () => {
    const element = createTextElement({ id: "text", x: 10, y: 15, width: 20, height: 10 });
    const dragState = createDragState({
      clientX: 100,
      clientY: 100,
      element,
      mode: "move",
      selectedElements: [element],
    });

    expect(dragGeometryUpdates(dragState, 150, 130, { width: 500, height: 300 }, true)).toEqual([
      { id: "text", patch: { x: 20, y: 15 } },
    ]);
    expect(dragGeometryUpdates(dragState, 120, 190, { width: 500, height: 300 }, true)).toEqual([
      { id: "text", patch: { x: 10, y: 45 } },
    ]);
  });

  it("classifies canvas pointer down actions", () => {
    const text = createTextElement({ id: "text" });
    const image = createImageElement({ id: "image" });

    expect(
      canvasPointerDownAction({
        button: 2,
        ctrlKey: false,
        detail: 1,
        element: null,
        elementId: null,
        isEditableTarget: false,
        isResize: false,
        isSelected: false,
        multiSelect: false,
      }),
    ).toEqual({ kind: "ignore" });

    expect(
      canvasPointerDownAction({
        button: 0,
        ctrlKey: false,
        detail: 1,
        element: null,
        elementId: null,
        isEditableTarget: false,
        isResize: false,
        isSelected: false,
        multiSelect: false,
      }),
    ).toEqual({ kind: "start-marquee" });

    expect(
      canvasPointerDownAction({
        button: 0,
        ctrlKey: false,
        detail: 2,
        element: text,
        elementId: "text",
        isEditableTarget: false,
        isResize: false,
        isSelected: false,
        multiSelect: false,
      }),
    ).toEqual({ element: text, kind: "edit-text" });

    expect(
      canvasPointerDownAction({
        button: 0,
        ctrlKey: false,
        detail: 1,
        element: image,
        elementId: "image",
        isEditableTarget: false,
        isResize: false,
        isSelected: true,
        multiSelect: true,
      }),
    ).toEqual({ elementId: "image", kind: "toggle-selection-off" });

    expect(
      canvasPointerDownAction({
        button: 0,
        ctrlKey: false,
        detail: 1,
        element: image,
        elementId: "image",
        isEditableTarget: false,
        isResize: true,
        isSelected: true,
        multiSelect: false,
      }),
    ).toEqual({ element: image, kind: "start-drag", mode: "resize" });

    expect(
      canvasPointerDownAction({
        button: 0,
        ctrlKey: false,
        detail: 1,
        element: image,
        elementId: "image",
        isEditableTarget: false,
        isResize: false,
        isSelected: true,
        multiSelect: true,
        shiftKey: true,
      }),
    ).toEqual({ element: image, kind: "start-drag", mode: "move" });
  });

  it("keeps image resizing proportional while shift is held", () => {
    const image = createImageElement({ id: "image", x: 10, y: 10, width: 40, height: 20 });
    const dragState = createDragState({
      clientX: 100,
      clientY: 100,
      element: image,
      mode: "resize",
      selectedElements: [image],
    });

    expect(dragGeometryUpdates(dragState, 200, 110, { width: 500, height: 300 }, true)).toEqual([
      { id: "image", patch: { width: 60, height: 30 } },
    ]);
  });

  it("computes rotation geometry and snaps while shift is held", () => {
    const shape = createShapeElement({ id: "shape", x: 10, y: 10, width: 20, height: 10 });
    const dragState = createDragState({
      canvasRect: { height: 500, left: 0, top: 0, width: 1000 },
      clientX: 200,
      clientY: 50,
      element: shape,
      mode: "rotate",
      selectedElements: [shape],
    });

    expect(dragGeometryUpdates(dragState, 300, 75, { width: 1000, height: 500 }, false)).toEqual([
      { id: "shape", patch: { rotation: 90 } },
    ]);
    expect(dragGeometryUpdates(dragState, 300, 130, { width: 1000, height: 500 }, true)).toEqual([
      { id: "shape", patch: { rotation: 120 } },
    ]);
  });

  it("tracks selection marquee state and additive selection", () => {
    const state = createSelectionMarqueeState({
      additive: true,
      box: {} as HTMLElement,
      originIds: ["existing"],
      pointerId: 1,
      start: { x: 10, y: 20 },
    });

    expect(selectionMarqueeRect(state, { x: 40, y: 10 })).toEqual({
      x: 10,
      y: 10,
      width: 30,
      height: 10,
    });
    expect(nextSelectionFromMarquee(state, ["inside"])).toEqual(["existing", "inside"]);
  });

  it("reorders slides without mutating the original deck", () => {
    const slides = MikroDeck.create({ title: "Reorder" }).toRecord().slides.slice(0, 3);
    const [first, second, third] = slides;
    const result = reorderSlides(slides, first.id, third.id, "after");

    expect(result.changed).toBe(true);
    expect(result.slides.map((slide) => slide.id)).toEqual([second.id, third.id, first.id]);
    expect(slides.map((slide) => slide.id)).toEqual([first.id, second.id, third.id]);
  });

  it("keeps context menus onscreen and disables unavailable actions", () => {
    expect(
      constrainedMenuPosition(500, 500, { width: 120, height: 80 }, { width: 520, height: 520 }),
    ).toEqual({ x: 392, y: 432 });
    expect(isContextActionDisabled("copy", menuAvailability({ hasSelection: false }))).toBe(true);
    expect(isContextActionDisabled("paste", menuAvailability({ hasClipboard: false }))).toBe(true);
    expect(isContextActionDisabled("lock", menuAvailability({ hasUnlockedSelection: false }))).toBe(
      true,
    );
    expect(isContextActionDisabled("unlock", menuAvailability({ hasLockedSelection: false }))).toBe(
      true,
    );
    expect(isContextActionDisabled("add-text", menuAvailability({ hasSelection: false }))).toBe(
      false,
    );
  });

  it("classifies canvas context-menu selection behavior", () => {
    expect(
      canvasContextSelectionAction({
        elementId: "text",
        selectedElementIds: [],
        slideElementIds: ["text"],
        targetIsCanvas: false,
      }),
    ).toEqual({ elementId: "text", kind: "select-element" });

    expect(
      canvasContextSelectionAction({
        elementId: "text",
        selectedElementIds: ["text"],
        slideElementIds: ["text"],
        targetIsCanvas: false,
      }),
    ).toEqual({ kind: "keep-selection" });

    expect(
      canvasContextSelectionAction({
        elementId: null,
        selectedElementIds: ["text"],
        slideElementIds: ["text"],
        targetIsCanvas: true,
      }),
    ).toEqual({ kind: "select-slide" });
  });

  it("reads and dispatches context menu actions", () => {
    const button = { dataset: { contextAction: "copy" }, disabled: false };
    const event = {
      target: { closest: () => button },
    } as unknown as MouseEvent;
    expect(contextMenuActionFromEvent(event)).toBe("copy");

    button.disabled = true;
    expect(contextMenuActionFromEvent(event)).toBeNull();

    const calls: string[] = [];
    runContextMenuAction("delete", {
      "add-image": () => calls.push("add-image"),
      "add-shape": () => calls.push("add-shape"),
      "add-text": () => calls.push("add-text"),
      "bring-front": () => calls.push("bring-front"),
      copy: () => calls.push("copy"),
      cut: () => calls.push("cut"),
      delete: () => calls.push("delete"),
      duplicate: () => calls.push("duplicate"),
      lock: () => calls.push("lock"),
      paste: () => calls.push("paste"),
      "send-back": () => calls.push("send-back"),
      unlock: () => calls.push("unlock"),
    });
    expect(calls).toEqual(["delete"]);
  });
});

function menuAvailability(
  overrides: Partial<{
    hasClipboard: boolean;
    hasLockedSelection: boolean;
    hasSelection: boolean;
    hasUnlockedSelection: boolean;
  }> = {},
) {
  return {
    hasClipboard: true,
    hasLockedSelection: true,
    hasSelection: true,
    hasUnlockedSelection: true,
    ...overrides,
  };
}
