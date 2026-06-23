import type {
  ImageFit,
  ShapeArrowHead,
  SlideElement,
  SlideShapeKind,
  TextAlignment,
  TextFontFamily,
  TextListStyle,
  TextVerticalAlignment,
} from "../index.js";
import type { ObjectAlignment } from "./deckMutations.js";
import type { FontManager } from "./fontManager.js";
import { readNumber } from "./inspectorPanel.js";
import { isShapeSelectorTool, type ShapeSelectorTool } from "./shapeSelectorView.js";

export type AppEventElements = {
  addImageButton: HTMLButtonElement;
  addShapeButton: HTMLElement;
  currentShapeIcon: SVGUseElement;
  shapeOptions: HTMLElement;
  shapeSelector: HTMLDetailsElement;
  addSlideButton: HTMLButtonElement;
  addTextButton: HTMLButtonElement;
  contextMenu: HTMLElement;
  createOutlineDeckButton: HTMLButtonElement;
  deckAspectSelect: HTMLSelectElement;
  deckList: HTMLElement;
  deckThemeSelect: HTMLSelectElement;
  deckTitleInput: HTMLInputElement;
  deleteElementButton: HTMLButtonElement;
  deleteSlideButton: HTMLButtonElement;
  duplicateElementButton: HTMLButtonElement;
  duplicateSlideButton: HTMLButtonElement;
  elementHeightInput: HTMLInputElement;
  elementLockedInput: HTMLInputElement;
  elementOpacityInput: HTMLInputElement;
  elementRotationInput: HTMLInputElement;
  elementWidthInput: HTMLInputElement;
  elementXInput: HTMLInputElement;
  elementYInput: HTMLInputElement;
  exportButton: HTMLButtonElement;
  exportJsonAction: HTMLButtonElement;
  exportPdfAction: HTMLButtonElement;
  exportPngAction: HTMLButtonElement;
  exportPortableAction: HTMLButtonElement;
  imageAltInput: HTMLInputElement;
  imageDialog: HTMLDialogElement;
  imageFitSelect: HTMLSelectElement;
  imageSrcInput: HTMLInputElement;
  importJsonButton: HTMLButtonElement;
  insertImageButton: HTMLButtonElement;
  jsonFileInput: HTMLInputElement;
  layerBackButton: HTMLButtonElement;
  layerBackwardButton: HTMLButtonElement;
  layerForwardButton: HTMLButtonElement;
  layerFrontButton: HTMLButtonElement;
  layersList: HTMLElement;
  libraryButton: HTMLButtonElement;
  libraryDialog: HTMLDialogElement;
  librarySearch: HTMLInputElement;
  manageFontsButton: HTMLButtonElement;
  newDeckButton: HTMLButtonElement;
  outlineButton: HTMLButtonElement;
  outlineInput: HTMLTextAreaElement;
  presentButton: HTMLButtonElement;
  presenterDialog: HTMLDialogElement;
  presenterNextButton: HTMLButtonElement;
  presenterPrevButton: HTMLButtonElement;
  presenterSlide: HTMLElement;
  redoButton: HTMLButtonElement;
  saveTemplateButton: HTMLButtonElement;
  saveTemplateConfirmButton: HTMLButtonElement;
  shapeFields: HTMLElement;
  shapeFillInput: HTMLInputElement;
  shapeFillNoneButton: HTMLButtonElement;
  shapeKindSelect: HTMLSelectElement;
  shapeRadiusInput: HTMLInputElement;
  shapeArrowHeadSelect: HTMLSelectElement;
  shapeStrokeNoneButton: HTMLButtonElement;
  shapeStrokeInput: HTMLInputElement;
  shapeStrokeWidthInput: HTMLInputElement;
  slideBackgroundInput: HTMLInputElement;
  slideContextMenu: HTMLElement;
  slideCanvas: HTMLElement;
  slideList: HTMLElement;
  selectionToolbar: HTMLElement;
  speakerNotes: HTMLTextAreaElement;
  templateSelect: HTMLSelectElement;
  textColorInput: HTMLInputElement;
  textContentInput: HTMLTextAreaElement;
  textFields: HTMLElement;
  textFontSelect: HTMLSelectElement;
  textLineHeightInput: HTMLInputElement;
  textListStyleSelect: HTMLSelectElement;
  textSizeInput: HTMLInputElement;
  textWeightInput: HTMLInputElement;
  themeButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  zoomFitButton: HTMLButtonElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
};

export type AppEventHandlers = {
  addShapeElement: (shape?: ShapeSelectorTool) => void;
  addSlide: () => void;
  addTextElement: () => void;
  alignSelectedElements: (alignment: ObjectAlignment) => void;
  applySelectedTemplate: () => void;
  closeContextMenu: () => void;
  createDeck: () => Promise<void>;
  createDeckFromOutlineText: (markdown: string) => Promise<void>;
  deleteSelectedElement: () => void;
  deleteSlide: () => void;
  duplicateSelectedElement: () => void;
  duplicateSlide: () => void;
  exportJson: () => void;
  exportPdf: () => void;
  exportPng: () => Promise<void>;
  exportPortable: () => Promise<void>;
  getCanvasZoom: () => number;
  handleCanvasClick: (event: MouseEvent) => void;
  handleCanvasContextMenu: (event: MouseEvent) => void;
  handleCanvasDoubleClick: (event: MouseEvent) => void;
  handleCanvasDragOver: (event: DragEvent) => void;
  handleCanvasDrop: (event: DragEvent) => Promise<void>;
  handleCanvasFocusOut: (event: FocusEvent) => void;
  handleCanvasPointerDown: (event: PointerEvent) => void;
  handleCanvasTextInput: (event: Event) => void;
  handleContextMenuClick: (event: MouseEvent) => void;
  handleDeckListClick: (event: MouseEvent) => Promise<void>;
  handleKeyboard: (event: KeyboardEvent) => Promise<void>;
  handleLayerListClick: (event: MouseEvent) => void;
  handlePaste: (event: ClipboardEvent) => Promise<void>;
  handlePointerCancel: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
  handleSlideDragEnd: () => void;
  handleSlideDragLeave: (event: DragEvent) => void;
  handleSlideDragOver: (event: DragEvent) => void;
  handleSlideDragStart: (event: DragEvent) => void;
  handleSlideDrop: (event: DragEvent) => void;
  handleSlideContextMenuClick: (event: MouseEvent) => void;
  handleSlideListClick: (event: MouseEvent) => void;
  handleSlideListContextMenu: (event: MouseEvent) => void;
  handleSlideListKeyDown: (event: KeyboardEvent) => void;
  importJsonFile: (event: Event) => Promise<void>;
  insertImageFromDialog: () => Promise<void>;
  movePresenter: (direction: -1 | 1) => void;
  openCommandPalette: () => void;
  openDialog: (dialog: HTMLDialogElement) => void;
  openExportDialog: () => void;
  openFontDialog: () => void;
  openOutlineDialog: () => void;
  openPresenter: () => void;
  openTemplateDialog: () => void;
  queryDialog: (selector: string) => HTMLDialogElement;
  renderLibrary: () => void;
  reorderSelectedElements: (action: "front" | "forward" | "backward" | "back") => void;
  saveUserTemplateFromDialog: () => void;
  setCanvasZoom: (value: number) => void;
  toggleSelectedTextListStyle: (style: TextListStyle) => void;
  toggleTheme: () => void;
  undo: () => void;
  redo: () => void;
  updateCurrentSlide: (patch: Record<string, unknown>, options?: { inspector?: boolean }) => void;
  updateDeckAspect: () => void;
  updateDeckTheme: () => void;
  updateDeckTitle: (title: string) => void;
  updateSelectedElement: (patch: Partial<SlideElement>, options?: { inspector?: boolean }) => void;
};

export function bindAppEvents(
  elements: AppEventElements,
  fontManager: FontManager,
  handlers: AppEventHandlers,
  documentRef: Document = document,
  windowRef: Window = window,
) {
  elements.deckTitleInput.addEventListener("input", () =>
    handlers.updateDeckTitle(elements.deckTitleInput.value),
  );
  elements.deckTitleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      elements.deckTitleInput.blur();
    }
  });
  elements.newDeckButton.addEventListener("click", () => void handlers.createDeck());
  elements.libraryButton.addEventListener("click", () =>
    handlers.openDialog(elements.libraryDialog),
  );
  elements.importJsonButton.addEventListener("click", () => elements.jsonFileInput.click());
  elements.outlineButton.addEventListener("click", handlers.openOutlineDialog);
  elements.exportButton.addEventListener("click", handlers.openExportDialog);
  elements.presentButton.addEventListener("click", handlers.openPresenter);
  elements.themeButton.addEventListener("click", handlers.toggleTheme);
  elements.addSlideButton.addEventListener("click", handlers.addSlide);
  elements.undoButton.addEventListener("click", handlers.undo);
  elements.redoButton.addEventListener("click", handlers.redo);
  elements.addTextButton.addEventListener("click", handlers.addTextElement);
  elements.shapeOptions.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>("[data-shape-tool]");
    const shape = button?.dataset.shapeTool;
    if (!isShapeSelectorTool(shape)) {
      return;
    }

    handlers.addShapeElement(shape);
    elements.shapeSelector.open = false;
  });
  elements.addImageButton.addEventListener("click", () =>
    handlers.openDialog(elements.imageDialog),
  );
  elements.templateSelect.addEventListener("change", handlers.applySelectedTemplate);
  elements.saveTemplateButton.addEventListener("click", handlers.openTemplateDialog);
  elements.duplicateElementButton.addEventListener("click", handlers.duplicateSelectedElement);
  elements.duplicateSlideButton.addEventListener("click", handlers.duplicateSlide);
  elements.deleteSlideButton.addEventListener("click", handlers.deleteSlide);
  elements.zoomOutButton.addEventListener("click", () =>
    handlers.setCanvasZoom(handlers.getCanvasZoom() - 0.15),
  );
  elements.zoomFitButton.addEventListener("click", () => handlers.setCanvasZoom(1));
  elements.zoomInButton.addEventListener("click", () =>
    handlers.setCanvasZoom(handlers.getCanvasZoom() + 0.15),
  );
  elements.deleteElementButton.addEventListener("click", handlers.deleteSelectedElement);
  elements.librarySearch.addEventListener("input", handlers.renderLibrary);
  elements.insertImageButton.addEventListener("click", () => void handlers.insertImageFromDialog());
  elements.jsonFileInput.addEventListener("change", (event) => void handlers.importJsonFile(event));
  elements.deckThemeSelect.addEventListener("change", handlers.updateDeckTheme);
  elements.deckAspectSelect.addEventListener("change", handlers.updateDeckAspect);
  elements.slideBackgroundInput.addEventListener("input", () =>
    handlers.updateCurrentSlide({ background: elements.slideBackgroundInput.value }),
  );
  elements.speakerNotes.addEventListener("input", () =>
    handlers.updateCurrentSlide(
      { speakerNotes: elements.speakerNotes.value },
      { inspector: false },
    ),
  );
  bindSlideEvents(elements, handlers);
  bindCanvasEvents(elements, handlers, windowRef);
  bindInspectorEvents(elements, handlers);
  bindSelectionToolbarEvents(elements, handlers);
  bindPresenterEvents(elements, handlers, documentRef);
  bindLayerEvents(elements, handlers);
  fontManager.bindEvents();
  elements.contextMenu.addEventListener("click", handlers.handleContextMenuClick);
  elements.slideContextMenu.addEventListener("click", handlers.handleSlideContextMenuClick);
  bindExportEvents(elements, handlers);
  elements.createOutlineDeckButton.addEventListener(
    "click",
    () => void handlers.createDeckFromOutlineText(elements.outlineInput.value),
  );
  bindGlobalDelegates(elements, handlers, documentRef);
  documentRef.addEventListener("keydown", (event) => void handlers.handleKeyboard(event));
  documentRef.addEventListener("paste", (event) => void handlers.handlePaste(event));
}

function bindSlideEvents(elements: AppEventElements, handlers: AppEventHandlers) {
  elements.slideList.addEventListener("click", handlers.handleSlideListClick);
  elements.slideList.addEventListener("contextmenu", handlers.handleSlideListContextMenu);
  elements.slideList.addEventListener("keydown", handlers.handleSlideListKeyDown);
  elements.slideList.addEventListener("dragstart", handlers.handleSlideDragStart);
  elements.slideList.addEventListener("dragover", handlers.handleSlideDragOver);
  elements.slideList.addEventListener("drop", handlers.handleSlideDrop);
  elements.slideList.addEventListener("dragend", handlers.handleSlideDragEnd);
  elements.slideList.addEventListener("dragleave", handlers.handleSlideDragLeave);
  elements.deckList.addEventListener("click", (event) => void handlers.handleDeckListClick(event));
}

function bindCanvasEvents(
  elements: AppEventElements,
  handlers: AppEventHandlers,
  windowRef: Window,
) {
  elements.slideCanvas.addEventListener("pointerdown", handlers.handleCanvasPointerDown);
  elements.slideCanvas.addEventListener("contextmenu", handlers.handleCanvasContextMenu);
  elements.slideCanvas.addEventListener("dragover", handlers.handleCanvasDragOver);
  elements.slideCanvas.addEventListener("drop", (event) => void handlers.handleCanvasDrop(event));
  elements.slideCanvas.addEventListener("click", handlers.handleCanvasClick);
  elements.slideCanvas.addEventListener("dblclick", handlers.handleCanvasDoubleClick);
  elements.slideCanvas.addEventListener("beforeinput", handlers.handleCanvasTextInput);
  elements.slideCanvas.addEventListener("input", handlers.handleCanvasTextInput);
  elements.slideCanvas.addEventListener("focusout", handlers.handleCanvasFocusOut);
  windowRef.addEventListener("pointermove", handlers.handlePointerMove);
  windowRef.addEventListener("pointerup", handlers.handlePointerUp);
  windowRef.addEventListener("pointercancel", handlers.handlePointerCancel);
}

function bindInspectorEvents(elements: AppEventElements, handlers: AppEventHandlers) {
  elements.elementXInput.addEventListener("input", () =>
    handlers.updateSelectedElement({ x: readNumber(elements.elementXInput) }, { inspector: false }),
  );
  elements.elementYInput.addEventListener("input", () =>
    handlers.updateSelectedElement({ y: readNumber(elements.elementYInput) }, { inspector: false }),
  );
  elements.elementWidthInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { width: readNumber(elements.elementWidthInput) },
      { inspector: false },
    ),
  );
  elements.elementHeightInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { height: readNumber(elements.elementHeightInput) },
      { inspector: false },
    ),
  );
  elements.elementRotationInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { rotation: readNumber(elements.elementRotationInput) },
      { inspector: false },
    ),
  );
  elements.elementOpacityInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { opacity: readNumber(elements.elementOpacityInput) },
      { inspector: false },
    ),
  );
  elements.elementLockedInput.addEventListener("change", () =>
    handlers.updateSelectedElement(
      { locked: elements.elementLockedInput.checked },
      { inspector: false },
    ),
  );
  elements.textContentInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { content: elements.textContentInput.value },
      { inspector: false },
    ),
  );
  elements.textFontSelect.addEventListener("change", () =>
    handlers.updateSelectedElement(
      { fontFamily: elements.textFontSelect.value as TextFontFamily },
      { inspector: false },
    ),
  );
  elements.manageFontsButton.addEventListener("click", handlers.openFontDialog);
  elements.textSizeInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { fontSize: readNumber(elements.textSizeInput) },
      { inspector: false },
    ),
  );
  elements.textWeightInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { fontWeight: readNumber(elements.textWeightInput) },
      { inspector: false },
    ),
  );
  elements.textLineHeightInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { lineHeight: readNumber(elements.textLineHeightInput) },
      { inspector: false },
    ),
  );
  elements.textColorInput.addEventListener("input", () =>
    handlers.updateSelectedElement({ color: elements.textColorInput.value }),
  );
  elements.textFields.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const colorSwatch = target?.closest<HTMLButtonElement>("[data-text-color]");
    if (colorSwatch?.dataset.textColor) {
      handlers.updateSelectedElement({ color: colorSwatch.dataset.textColor });
    }
  });
  elements.textListStyleSelect.addEventListener("change", () =>
    handlers.updateSelectedElement(
      { listStyle: elements.textListStyleSelect.value as TextListStyle },
      { inspector: false },
    ),
  );
  elements.shapeKindSelect.addEventListener("change", () =>
    handlers.updateSelectedElement(
      { shape: elements.shapeKindSelect.value as SlideShapeKind },
      { inspector: false },
    ),
  );
  elements.shapeFields.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const fillSwatch = target?.closest<HTMLButtonElement>("[data-shape-fill]");
    if (fillSwatch?.dataset.shapeFill) {
      handlers.updateSelectedElement({ fill: fillSwatch.dataset.shapeFill });
      return;
    }

    const strokeSwatch = target?.closest<HTMLButtonElement>("[data-shape-stroke]");
    if (strokeSwatch?.dataset.shapeStroke) {
      handlers.updateSelectedElement({ stroke: strokeSwatch.dataset.shapeStroke });
    }
  });
  elements.shapeFillInput.addEventListener("input", () =>
    handlers.updateSelectedElement({ fill: elements.shapeFillInput.value }),
  );
  elements.shapeFillNoneButton.addEventListener("click", () =>
    handlers.updateSelectedElement({ fill: "none" }),
  );
  elements.shapeStrokeInput.addEventListener("input", () =>
    handlers.updateSelectedElement({ stroke: elements.shapeStrokeInput.value }),
  );
  elements.shapeStrokeNoneButton.addEventListener("click", () =>
    handlers.updateSelectedElement({ stroke: "none" }),
  );
  elements.shapeStrokeWidthInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { strokeWidth: readNumber(elements.shapeStrokeWidthInput) },
      { inspector: false },
    ),
  );
  elements.shapeArrowHeadSelect.addEventListener("change", () =>
    handlers.updateSelectedElement(
      { arrowHead: elements.shapeArrowHeadSelect.value as ShapeArrowHead },
      { inspector: false },
    ),
  );
  elements.shapeRadiusInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { radius: readNumber(elements.shapeRadiusInput) },
      { inspector: false },
    ),
  );
  elements.imageSrcInput.addEventListener("input", () =>
    handlers.updateSelectedElement({ src: elements.imageSrcInput.value }, { inspector: false }),
  );
  elements.imageAltInput.addEventListener("input", () =>
    handlers.updateSelectedElement({ alt: elements.imageAltInput.value }, { inspector: false }),
  );
  elements.imageFitSelect.addEventListener("change", () =>
    handlers.updateSelectedElement(
      { fit: elements.imageFitSelect.value as ImageFit },
      { inspector: false },
    ),
  );
}

function bindPresenterEvents(
  elements: AppEventElements,
  handlers: AppEventHandlers,
  documentRef: Document,
) {
  elements.presenterPrevButton.addEventListener("click", () => handlers.movePresenter(-1));
  elements.presenterNextButton.addEventListener("click", () => handlers.movePresenter(1));
  elements.presenterSlide.addEventListener("click", () => handlers.movePresenter(1));
  elements.presenterDialog.addEventListener("close", () => {
    if (documentRef.fullscreenElement === elements.presenterDialog) {
      void documentRef.exitFullscreen().catch(() => undefined);
    }
  });
}

function bindLayerEvents(elements: AppEventElements, handlers: AppEventHandlers) {
  elements.layersList.addEventListener("click", handlers.handleLayerListClick);
  elements.layerFrontButton.addEventListener("click", () =>
    handlers.reorderSelectedElements("front"),
  );
  elements.layerForwardButton.addEventListener("click", () =>
    handlers.reorderSelectedElements("forward"),
  );
  elements.layerBackwardButton.addEventListener("click", () =>
    handlers.reorderSelectedElements("backward"),
  );
  elements.layerBackButton.addEventListener("click", () =>
    handlers.reorderSelectedElements("back"),
  );
  elements.saveTemplateConfirmButton.addEventListener("click", handlers.saveUserTemplateFromDialog);
}

function bindSelectionToolbarEvents(elements: AppEventElements, handlers: AppEventHandlers) {
  elements.selectionToolbar.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const textSwatch = target?.closest<HTMLButtonElement>("[data-text-color]");
    if (textSwatch?.dataset.textColor) {
      handlers.updateSelectedElement({ color: textSwatch.dataset.textColor });
      return;
    }

    const fillSwatch = target?.closest<HTMLButtonElement>("[data-shape-fill]");
    if (fillSwatch?.dataset.shapeFill) {
      handlers.updateSelectedElement({ fill: fillSwatch.dataset.shapeFill });
      return;
    }

    const action = selectionToolbarActionFromTarget(target);
    if (!action) {
      return;
    }

    if (action === "back" || action === "front") {
      handlers.reorderSelectedElements(action);
      return;
    }

    if (action === "clear-fill") {
      handlers.updateSelectedElement({ fill: "none" });
      return;
    }

    if (action === "delete") {
      handlers.deleteSelectedElement();
      return;
    }

    if (action === "duplicate") {
      handlers.duplicateSelectedElement();
      return;
    }

    handlers.updateSelectedElement({ locked: action === "lock" });
  });
}

function bindExportEvents(elements: AppEventElements, handlers: AppEventHandlers) {
  elements.exportJsonAction.addEventListener("click", handlers.exportJson);
  elements.exportPortableAction.addEventListener("click", () => void handlers.exportPortable());
  elements.exportPdfAction.addEventListener("click", handlers.exportPdf);
  elements.exportPngAction.addEventListener("click", () => void handlers.exportPng());
}

function bindGlobalDelegates(
  elements: Pick<AppEventElements, "deckTitleInput" | "shapeSelector">,
  handlers: AppEventHandlers,
  documentRef: Document,
) {
  documentRef.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    blurDeckTitleFromOutsideClick(documentRef.activeElement, target, elements.deckTitleInput);
    if (!target?.closest(".shape-selector")) {
      elements.shapeSelector.open = false;
    }

    const closeDialogId = target?.closest<HTMLElement>("[data-close-dialog]")?.dataset.closeDialog;
    if (closeDialogId) {
      handlers.queryDialog(`#${closeDialogId}`).close();
      return;
    }

    const swatch = target?.closest<HTMLButtonElement>("[data-background]");
    if (swatch?.dataset.background) {
      handlers.updateCurrentSlide({ background: swatch.dataset.background });
      return;
    }

    const objectAlignment = objectAlignmentFromTarget(target);
    if (objectAlignment) {
      handlers.alignSelectedElements(objectAlignment);
      return;
    }

    const alignButton = target?.closest<HTMLButtonElement>("[data-align]");
    if (alignButton?.dataset.align) {
      handlers.updateSelectedElement({ align: alignButton.dataset.align as TextAlignment });
      return;
    }

    const verticalAlignButton = target?.closest<HTMLButtonElement>("[data-valign]");
    if (verticalAlignButton?.dataset.valign) {
      handlers.updateSelectedElement({
        verticalAlign: verticalAlignButton.dataset.valign as TextVerticalAlignment,
      });
      return;
    }

    const listStyleButton = target?.closest<HTMLButtonElement>("[data-list-style]");
    if (listStyleButton?.dataset.listStyle) {
      handlers.toggleSelectedTextListStyle(listStyleButton.dataset.listStyle as TextListStyle);
      return;
    }

    if (!target?.closest(".context-menu")) {
      handlers.closeContextMenu();
    }
  });
}

export function blurDeckTitleFromOutsideClick(
  activeElement: Element | null,
  target: HTMLElement | null,
  deckTitleInput: HTMLInputElement,
) {
  if (activeElement !== deckTitleInput || target === deckTitleInput) {
    return false;
  }

  deckTitleInput.blur();
  return true;
}

export function objectAlignmentFromTarget(target: HTMLElement | null): ObjectAlignment | null {
  const button = target?.closest<HTMLButtonElement>("[data-object-align]");
  const alignment = button?.dataset.objectAlign;
  return isObjectAlignment(alignment) ? alignment : null;
}

export type SelectionToolbarAction =
  | "back"
  | "clear-fill"
  | "delete"
  | "duplicate"
  | "front"
  | "lock"
  | "unlock";

export function selectionToolbarActionFromTarget(
  target: Element | null,
): SelectionToolbarAction | null {
  const button = target?.closest<HTMLButtonElement>("[data-selection-action]");
  const action = button?.dataset.selectionAction;
  return isSelectionToolbarAction(action) ? action : null;
}

function isSelectionToolbarAction(value: string | undefined): value is SelectionToolbarAction {
  return (
    value === "back" ||
    value === "clear-fill" ||
    value === "delete" ||
    value === "duplicate" ||
    value === "front" ||
    value === "lock" ||
    value === "unlock"
  );
}

function isObjectAlignment(value: string | undefined): value is ObjectAlignment {
  return (
    value === "bottom" ||
    value === "center" ||
    value === "left" ||
    value === "middle" ||
    value === "right" ||
    value === "top"
  );
}
