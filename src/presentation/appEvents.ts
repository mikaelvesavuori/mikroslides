import type {
  ImageFit,
  SlideElement,
  SlideShapeKind,
  TextAlignment,
  TextFontFamily,
  TextListStyle,
} from "../index.js";
import type { ObjectAlignment } from "./deckMutations.js";
import type { FontManager } from "./fontManager.js";
import { readNumber } from "./inspectorPanel.js";

export type AppEventElements = {
  addImageButton: HTMLButtonElement;
  addShapeButton: HTMLButtonElement;
  addSlideButton: HTMLButtonElement;
  addTextButton: HTMLButtonElement;
  commandButton: HTMLButtonElement;
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
  elementOpacityInput: HTMLInputElement;
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
  polishButton: HTMLButtonElement;
  presentButton: HTMLButtonElement;
  presenterDialog: HTMLDialogElement;
  presenterNextButton: HTMLButtonElement;
  presenterPrevButton: HTMLButtonElement;
  presenterSlide: HTMLElement;
  redoButton: HTMLButtonElement;
  saveTemplateButton: HTMLButtonElement;
  saveTemplateConfirmButton: HTMLButtonElement;
  shapeFillInput: HTMLInputElement;
  shapeKindSelect: HTMLSelectElement;
  shapeStrokeInput: HTMLInputElement;
  slideBackgroundInput: HTMLInputElement;
  slideCanvas: HTMLElement;
  slideList: HTMLElement;
  speakerNotes: HTMLTextAreaElement;
  templateSelect: HTMLSelectElement;
  textColorInput: HTMLInputElement;
  textContentInput: HTMLTextAreaElement;
  textFontSelect: HTMLSelectElement;
  textSizeInput: HTMLInputElement;
  textWeightInput: HTMLInputElement;
  themeButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  zoomFitButton: HTMLButtonElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
};

export type AppEventHandlers = {
  addShapeElement: () => void;
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
  handleSlideListClick: (event: MouseEvent) => void;
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
  polishDeck: () => void;
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
  elements.newDeckButton.addEventListener("click", () => void handlers.createDeck());
  elements.libraryButton.addEventListener("click", () =>
    handlers.openDialog(elements.libraryDialog),
  );
  elements.importJsonButton.addEventListener("click", () => elements.jsonFileInput.click());
  elements.outlineButton.addEventListener("click", handlers.openOutlineDialog);
  elements.polishButton.addEventListener("click", handlers.polishDeck);
  elements.exportButton.addEventListener("click", handlers.openExportDialog);
  elements.presentButton.addEventListener("click", handlers.openPresenter);
  elements.commandButton.addEventListener("click", handlers.openCommandPalette);
  elements.themeButton.addEventListener("click", handlers.toggleTheme);
  elements.addSlideButton.addEventListener("click", handlers.addSlide);
  elements.undoButton.addEventListener("click", handlers.undo);
  elements.redoButton.addEventListener("click", handlers.redo);
  elements.addTextButton.addEventListener("click", handlers.addTextElement);
  elements.addShapeButton.addEventListener("click", handlers.addShapeElement);
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
    handlers.updateCurrentSlide(
      { background: elements.slideBackgroundInput.value },
      { inspector: false },
    ),
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
  bindPresenterEvents(elements, handlers, documentRef);
  bindLayerEvents(elements, handlers);
  fontManager.bindEvents();
  elements.contextMenu.addEventListener("click", handlers.handleContextMenuClick);
  bindExportEvents(elements, handlers);
  elements.createOutlineDeckButton.addEventListener(
    "click",
    () => void handlers.createDeckFromOutlineText(elements.outlineInput.value),
  );
  bindGlobalDelegates(handlers, documentRef);
  documentRef.addEventListener("keydown", (event) => void handlers.handleKeyboard(event));
  documentRef.addEventListener("paste", (event) => void handlers.handlePaste(event));
}

function bindSlideEvents(elements: AppEventElements, handlers: AppEventHandlers) {
  elements.slideList.addEventListener("click", handlers.handleSlideListClick);
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
  elements.slideCanvas.addEventListener("click", handlers.handleCanvasClick);
  elements.slideCanvas.addEventListener("dblclick", handlers.handleCanvasDoubleClick);
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
  elements.elementOpacityInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { opacity: readNumber(elements.elementOpacityInput) },
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
  elements.textColorInput.addEventListener("input", () =>
    handlers.updateSelectedElement({ color: elements.textColorInput.value }, { inspector: false }),
  );
  elements.shapeKindSelect.addEventListener("change", () =>
    handlers.updateSelectedElement(
      { shape: elements.shapeKindSelect.value as SlideShapeKind },
      { inspector: false },
    ),
  );
  elements.shapeFillInput.addEventListener("input", () =>
    handlers.updateSelectedElement({ fill: elements.shapeFillInput.value }, { inspector: false }),
  );
  elements.shapeStrokeInput.addEventListener("input", () =>
    handlers.updateSelectedElement(
      { stroke: elements.shapeStrokeInput.value },
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

function bindExportEvents(elements: AppEventElements, handlers: AppEventHandlers) {
  elements.exportJsonAction.addEventListener("click", handlers.exportJson);
  elements.exportPortableAction.addEventListener("click", () => void handlers.exportPortable());
  elements.exportPdfAction.addEventListener("click", handlers.exportPdf);
  elements.exportPngAction.addEventListener("click", () => void handlers.exportPng());
}

function bindGlobalDelegates(handlers: AppEventHandlers, documentRef: Document) {
  documentRef.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
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

export function objectAlignmentFromTarget(target: HTMLElement | null): ObjectAlignment | null {
  const button = target?.closest<HTMLButtonElement>("[data-object-align]");
  const alignment = button?.dataset.objectAlign;
  return isObjectAlignment(alignment) ? alignment : null;
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
