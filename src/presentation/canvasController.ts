import type { MikroDeckRecord, SlideElement } from "../index.js";
import {
  canvasElementIdFromTarget,
  canvasPointerDownAction,
  createDragState,
  createSelectionMarqueeState,
  type DragState,
  dragGeometryUpdates,
  eventTargetElement,
  isEditableCanvasTarget,
  nextSelectionFromMarquee,
  type SelectionMarqueeState,
  selectionMarqueeRect,
  setSelectionMarqueeBox,
  syncCanvasSelectionAttributes,
  textElementIdFromTarget,
  tryReleasePointerCapture,
  trySetPointerCapture,
} from "./canvasInteraction.js";
import { canvasContextSelectionAction } from "./contextMenu.js";
import {
  duplicateElementsInPlaceInActiveSlide,
  updateElementsInActiveSlide,
} from "./deckMutations.js";
import { canvasPointPercent, elementIdsInRect, type PercentRect } from "./interactionGeometry.js";
import { isMultiSelectEvent, nextInteractionSelection } from "./selection.js";
import {
  insertTextAtCurrentSelection,
  isTextLineBreakInput,
  placeCaretAtPoint,
  readTextEditorContent,
  selectEditableContents,
} from "./textEditing.js";

type RenderOptions = {
  history?: boolean;
  inspector?: boolean;
  library?: boolean;
};

export type CanvasControllerOptions = {
  canvas: HTMLElement;
  closeContextMenu: () => void;
  documentRef: Document;
  flushHistorySnapshot: () => void;
  getDeck: () => MikroDeckRecord | null;
  getSelectedElementIds: () => string[];
  getSelectedElements: () => SlideElement[];
  getSlide: () => { elements: SlideElement[] } | null;
  openContextMenu: (clientX: number, clientY: number) => void;
  persistRecoveryDraft: () => Promise<void>;
  renderCanvas: () => void;
  renderHistoryControls: () => void;
  renderInspector: () => void;
  renderPrintDeck: () => void;
  scheduleAutosave: () => void;
  selectElements: (ids: string[]) => void;
  setDeck: (deck: MikroDeckRecord) => void;
  stageHistory: () => void;
  updateSelectedElementGeometry: (
    updates: Array<{ id: string; patch: Partial<SlideElement> }>,
    options?: RenderOptions,
  ) => void;
  windowRef: Pick<Window, "setTimeout">;
};

export function createCanvasController(options: CanvasControllerOptions) {
  let dragState: DragState | null = null;
  let selectionMarquee: SelectionMarqueeState | null = null;
  let editingTextElementId: string | null = null;
  let ignoreNextCanvasClick = false;
  let textEditPointerId: number | null = null;

  function selectElementFromInteraction(elementId: string, multiSelect: boolean) {
    options.selectElements(
      nextInteractionSelection(options.getSelectedElementIds(), elementId, multiSelect),
    );
  }

  function getCanvasPointPercent(clientX: number, clientY: number) {
    return canvasPointPercent(clientX, clientY, options.canvas.getBoundingClientRect());
  }

  function getSelectionMarqueeRect(clientX: number, clientY: number): PercentRect {
    if (!selectionMarquee) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    return selectionMarqueeRect(selectionMarquee, getCanvasPointPercent(clientX, clientY));
  }

  function getElementIdsInRect(rect: PercentRect) {
    const slide = options.getSlide();
    if (!slide || rect.width < 0.1 || rect.height < 0.1) {
      return [];
    }

    return elementIdsInRect(
      rect,
      slide.elements.filter((element) => !element.locked),
    );
  }

  function editableTextElementAtPoint(clientX: number, clientY: number) {
    const slide = options.getSlide();
    if (!slide) {
      return null;
    }

    const point = getCanvasPointPercent(clientX, clientY);
    for (const element of [...slide.elements].reverse()) {
      const inside =
        point.x >= element.x &&
        point.x <= element.x + element.width &&
        point.y >= element.y &&
        point.y <= element.y + element.height;
      if (!inside) {
        continue;
      }

      if (element.locked || (element.kind !== "text" && element.kind !== "shape")) {
        return null;
      }

      return element;
    }

    return null;
  }

  function beginEditingTextElement(elementId: string, clientX?: number, clientY?: number) {
    options.selectElements([elementId]);
    editingTextElementId = elementId;
    options.stageHistory();
    options.renderCanvas();
    options.renderInspector();
    options.windowRef.setTimeout(() => {
      const editor = options.canvas.querySelector<HTMLElement>(
        `[data-text-editor="${cssEscape(elementId)}"]`,
      );
      editor?.focus();
      if (!placeCaretAtPoint(editor, clientX, clientY)) {
        selectEditableContents(editor);
      }
    }, 0);
  }

  function finishEditingTextElement() {
    if (!editingTextElementId) {
      return;
    }

    editingTextElementId = null;
    options.flushHistorySnapshot();
  }

  function startSelectionMarquee(event: PointerEvent) {
    if (!options.getSlide() || event.button !== 0) {
      return;
    }

    const box = options.documentRef.createElement("div");
    box.className = "selection-marquee";
    box.setAttribute("aria-hidden", "true");
    options.canvas.append(box);

    selectionMarquee = createSelectionMarqueeState({
      additive: isMultiSelectEvent(event),
      box,
      originIds: options.getSelectedElementIds(),
      pointerId: event.pointerId,
      start: getCanvasPointPercent(event.clientX, event.clientY),
    });

    updateSelectionMarquee(event);
    trySetPointerCapture(options.canvas, event.pointerId);
    event.preventDefault();
  }

  function updateSelectionMarquee(event: PointerEvent) {
    if (!selectionMarquee || selectionMarquee.pointerId !== event.pointerId) {
      return;
    }

    const rect = getSelectionMarqueeRect(event.clientX, event.clientY);
    setSelectionMarqueeBox(selectionMarquee.box, rect);
    const matchedIds = getElementIdsInRect(rect);
    options.selectElements(nextSelectionFromMarquee(selectionMarquee, matchedIds));
    syncCanvasSelectionAttributes(options.canvas, options.getSelectedElementIds());
  }

  function finishSelectionMarquee(event: PointerEvent) {
    if (!selectionMarquee || selectionMarquee.pointerId !== event.pointerId) {
      return;
    }

    updateSelectionMarquee(event);
    selectionMarquee.box.remove();
    selectionMarquee = null;
    ignoreNextCanvasClick = true;
    tryReleasePointerCapture(options.canvas, event.pointerId);
    options.renderCanvas();
    options.renderInspector();
    options.renderHistoryControls();
  }

  return {
    beginEditingTextElement,
    getEditingTextElementId() {
      return editingTextElementId;
    },
    handleCanvasClick(event: MouseEvent) {
      const target = eventTargetElement(event);
      if (target?.closest("[data-text-editor]") || editingTextElementId) {
        return;
      }

      if (ignoreNextCanvasClick) {
        event.preventDefault();
        ignoreNextCanvasClick = false;
        return;
      }

      const elementId = canvasElementIdFromTarget(target);
      if (!elementId && target === options.canvas && !isMultiSelectEvent(event)) {
        options.selectElements([]);
        options.renderCanvas();
        options.renderInspector();
      }
    },
    handleCanvasContextMenu(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
      dragState = null;

      const target = eventTargetElement(event);
      const elementId = canvasElementIdFromTarget(target);
      const slide = options.getSlide();
      const action = canvasContextSelectionAction({
        elementId: elementId ?? null,
        selectedElementIds: options.getSelectedElementIds(),
        slideElementIds: slide?.elements.map((element) => element.id) ?? [],
        targetIsCanvas: Boolean(target === options.canvas || target?.closest(".slide-canvas")),
      });

      if (action.kind === "select-element") {
        options.selectElements([action.elementId]);
        options.renderCanvas();
        options.renderInspector();
      }

      if (action.kind === "select-slide") {
        options.selectElements([]);
        options.renderCanvas();
        options.renderInspector();
      }

      options.openContextMenu(event.clientX, event.clientY);
    },
    handleCanvasDoubleClick(event: MouseEvent) {
      if (eventTargetElement(event)?.closest("[data-text-editor]")) {
        return;
      }

      const elementId =
        textElementIdFromTarget(eventTargetElement(event)) ??
        editableTextElementAtPoint(event.clientX, event.clientY)?.id;
      if (!elementId) {
        return;
      }

      beginEditingTextElement(elementId, event.clientX, event.clientY);
      event.preventDefault();
    },
    handleCanvasFocusOut(event: FocusEvent) {
      const target = eventTargetElement(event);
      if (!target?.closest("[data-text-editor]")) {
        return;
      }

      if (textEditPointerId !== null) {
        return;
      }

      finishEditingTextElement();
      options.renderCanvas();
      options.renderInspector();
    },
    handleCanvasPointerDown(event: PointerEvent) {
      options.closeContextMenu();
      const target = eventTargetElement(event);
      const elementId = canvasElementIdFromTarget(target);
      const element = options.getSlide()?.elements.find((item) => item.id === elementId) ?? null;
      const isResize = Boolean(target?.closest("[data-resize]"));
      const wasSelected = Boolean(elementId && options.getSelectedElementIds().includes(elementId));
      const activeTextEditor = target?.closest<HTMLElement>("[data-text-editor]");
      const activeTextOverlay = target?.closest<HTMLElement>("[data-text-edit-overlay]");
      const isActiveTextEditorTarget = Boolean(
        editingTextElementId &&
          (activeTextEditor?.dataset.textEditor === editingTextElementId || activeTextOverlay),
      );

      if (isActiveTextEditorTarget && !isResize) {
        if (!activeTextEditor && editingTextElementId) {
          options.canvas
            .querySelector<HTMLElement>(
              `[data-text-editor="${cssEscape(editingTextElementId)}"]`,
            )
            ?.focus();
        }
        textEditPointerId = event.pointerId;
        return;
      }

      if (editingTextElementId) {
        finishEditingTextElement();
      }

      const doubleClickEditableElement =
        !elementId && event.detail >= 2
          ? editableTextElementAtPoint(event.clientX, event.clientY)
          : null;
      if (doubleClickEditableElement) {
        beginEditingTextElement(doubleClickEditableElement.id, event.clientX, event.clientY);
        event.preventDefault();
        return;
      }
      const multiSelect = isMultiSelectEvent(event);
      const action = canvasPointerDownAction({
        button: event.button,
        ctrlKey: event.ctrlKey,
        detail: event.detail,
        element,
        elementId: elementId ?? null,
        isEditableTarget: isEditableCanvasTarget(target),
        isResize,
        isSelected: wasSelected,
        multiSelect,
        shiftKey: event.shiftKey,
      });

      if (action.kind === "ignore") {
        return;
      }

      if (action.kind === "start-marquee") {
        startSelectionMarquee(event);
        return;
      }

      if (action.kind === "edit-text") {
        beginEditingTextElement(action.element.id, event.clientX, event.clientY);
        event.preventDefault();
        return;
      }

      if (action.kind === "toggle-selection-off") {
        options.selectElements(
          options.getSelectedElementIds().filter((id) => id !== action.elementId),
        );
        options.renderCanvas();
        options.renderInspector();
        ignoreNextCanvasClick = true;
        event.preventDefault();
        return;
      }

      if (action.element.locked) {
        startSelectionMarquee(event);
        return;
      }

      const constrainingSelectedMove = event.shiftKey && action.mode === "move" && wasSelected;
      const selectionMultiSelect = constrainingSelectedMove
        ? event.metaKey || event.ctrlKey
        : multiSelect;
      selectElementFromInteraction(action.element.id, selectionMultiSelect);
      options.stageHistory();
      let selectedElementsForDrag = options.getSelectedElements();

      if (event.altKey && action.mode === "move") {
        const deck = options.getDeck();
        const duplicated = deck
          ? duplicateElementsInPlaceInActiveSlide(deck, options.getSelectedElementIds())
          : null;
        if (duplicated) {
          options.setDeck(duplicated.deck);
          options.selectElements(duplicated.selectedElementIds);
          selectedElementsForDrag = options.getSelectedElements();
          void options.persistRecoveryDraft();
          options.renderCanvas();
          options.renderInspector();
          options.renderPrintDeck();
          options.scheduleAutosave();
        }
      }

      const dragElement =
        selectedElementsForDrag.find((item) => item.id === action.element.id) ??
        selectedElementsForDrag[0] ??
        action.element;
      dragState = createDragState({
        clientX: event.clientX,
        clientY: event.clientY,
        element: dragElement,
        mode: action.mode,
        selectedElements: selectedElementsForDrag,
      });
      trySetPointerCapture(options.canvas, event.pointerId);
      options.renderCanvas();
      options.renderInspector();
      ignoreNextCanvasClick = true;
      event.preventDefault();
    },
    handleCanvasTextInput(event: Event) {
      if (isTextLineBreakInput(event)) {
        event.preventDefault();
        insertTextAtCurrentSelection("\n", options.documentRef);
      } else if (event.type === "beforeinput") {
        return;
      }

      const target = eventTargetElement(event);
      const textEditor = target?.closest<HTMLElement>("[data-text-editor]");
      const elementId = textEditor?.dataset.textEditor;
      const deck = options.getDeck();
      if (!deck || !options.getSlide() || !elementId || editingTextElementId !== elementId) {
        return;
      }

      const text = readTextEditorContent(textEditor);
      options.setDeck(
        updateElementsInActiveSlide(deck, [
          { id: elementId, patch: { content: text } as Partial<SlideElement> },
        ]) ?? deck,
      );
      void options.persistRecoveryDraft();
      options.renderInspector();
      options.renderPrintDeck();
      options.scheduleAutosave();
    },
    handlePointerCancel(event: PointerEvent) {
      if (textEditPointerId === event.pointerId) {
        textEditPointerId = null;
        return;
      }

      if (selectionMarquee) {
        finishSelectionMarquee(event);
        return;
      }

      if (dragState) {
        this.handlePointerUp(event);
      }
    },
    handlePointerMove(event: PointerEvent) {
      if (selectionMarquee) {
        updateSelectionMarquee(event);
        return;
      }

      if (!dragState) {
        return;
      }

      options.updateSelectedElementGeometry(
        dragGeometryUpdates(
          dragState,
          event.clientX,
          event.clientY,
          options.canvas.getBoundingClientRect(),
          event.shiftKey,
        ),
        { history: false, inspector: false, library: false },
      );
    },
    handlePointerUp(event: PointerEvent) {
      if (textEditPointerId === event.pointerId) {
        textEditPointerId = null;
        return;
      }

      if (selectionMarquee) {
        finishSelectionMarquee(event);
        return;
      }

      if (!dragState) {
        return;
      }

      dragState = null;
      options.flushHistorySnapshot();
      options.renderCanvas();
      options.renderInspector();
    },
  };
}

function cssEscape(value: string) {
  const css = (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS;
  return css?.escape?.(value) ?? value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
