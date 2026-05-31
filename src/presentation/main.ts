import { downloadBytes, downloadText, readFileAsDataUrl, readFileAsText } from "../config/index.js";
import {
  createBlankSlide,
  createImageElement,
  createShapeElement,
  createTextElement,
  type DeckAspectRatio,
  DeckPolishService,
  DeckService,
  defaultDeckTheme,
  type ImageFit,
  IndexedDbDeckRepository,
  MikroDeck,
  type MikroDeckRecord,
  type MikroSlideRecord,
  OutlineImportService,
  type SlideElement,
  type SlideShapeKind,
  type TextAlignment,
  type TextSlideElement,
} from "../index.js";
import { createId } from "../shared/index.js";
import { type CommandAction, CommandPalette } from "./commandPalette.js";
import { backgroundSwatches, builtInDeckThemes, deckAspects } from "./deckOptions.js";
import { renderSlideToPng } from "./pngExport.js";
import { collectRemoteImageAssets } from "./portableAssets.js";
import { printCssForAspect, printDimensionsForAspect } from "./printSizing.js";
import { builtInTemplates, createTemplateSlide } from "./slideLayouts.js";

type RenderOptions = {
  inspector?: boolean;
  library?: boolean;
  history?: boolean;
};

type DragState = {
  elementId: string;
  mode: "move" | "resize";
  kind: SlideElement["kind"];
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  aspectRatio: number;
  selectedStarts: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
};

type SelectionMarqueeState = {
  pointerId: number;
  startX: number;
  startY: number;
  additive: boolean;
  originIds: string[];
  box: HTMLElement;
};

type PercentRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type UserTemplate = {
  id: string;
  name: string;
  slide: MikroSlideRecord;
  createdAt: string;
};

function queryElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

const elements = {
  html: document.documentElement,
  appShell: queryElement<HTMLElement>("#app-shell"),
  deckTitleInput: queryElement<HTMLInputElement>("#deck-title-input"),
  deckMeta: queryElement<HTMLElement>("#deck-meta"),
  slideList: queryElement<HTMLElement>("#slide-list"),
  slideCanvas: queryElement<HTMLElement>("#slide-canvas"),
  speakerNotes: queryElement<HTMLTextAreaElement>("#speaker-notes"),
  toast: queryElement<HTMLElement>("#toast"),
  printDeck: queryElement<HTMLElement>("#print-deck"),
  newDeckButton: queryElement<HTMLButtonElement>("#new-deck-btn"),
  libraryButton: queryElement<HTMLButtonElement>("#library-btn"),
  importJsonButton: queryElement<HTMLButtonElement>("#import-json-btn"),
  outlineButton: queryElement<HTMLButtonElement>("#outline-btn"),
  polishButton: queryElement<HTMLButtonElement>("#polish-btn"),
  exportButton: queryElement<HTMLButtonElement>("#export-btn"),
  presentButton: queryElement<HTMLButtonElement>("#present-btn"),
  commandButton: queryElement<HTMLButtonElement>("#command-btn"),
  themeButton: queryElement<HTMLButtonElement>("#theme-btn"),
  themeIcon: queryElement<SVGUseElement>("#theme-icon"),
  addSlideButton: queryElement<HTMLButtonElement>("#add-slide-btn"),
  undoButton: queryElement<HTMLButtonElement>("#undo-btn"),
  redoButton: queryElement<HTMLButtonElement>("#redo-btn"),
  addTextButton: queryElement<HTMLButtonElement>("#add-text-btn"),
  addShapeButton: queryElement<HTMLButtonElement>("#add-shape-btn"),
  addImageButton: queryElement<HTMLButtonElement>("#add-image-btn"),
  templateSelect: queryElement<HTMLSelectElement>("#template-select"),
  saveTemplateButton: queryElement<HTMLButtonElement>("#save-template-btn"),
  duplicateElementButton: queryElement<HTMLButtonElement>("#duplicate-element-btn"),
  duplicateSlideButton: queryElement<HTMLButtonElement>("#duplicate-slide-btn"),
  deleteSlideButton: queryElement<HTMLButtonElement>("#delete-slide-btn"),
  zoomOutButton: queryElement<HTMLButtonElement>("#zoom-out-btn"),
  zoomFitButton: queryElement<HTMLButtonElement>("#zoom-fit-btn"),
  zoomInButton: queryElement<HTMLButtonElement>("#zoom-in-btn"),
  libraryDialog: queryElement<HTMLDialogElement>("#library-dialog"),
  librarySearch: queryElement<HTMLInputElement>("#library-search"),
  deckList: queryElement<HTMLElement>("#deck-list"),
  imageDialog: queryElement<HTMLDialogElement>("#image-dialog"),
  imageUrlInput: queryElement<HTMLInputElement>("#image-url-input"),
  imageFileInput: queryElement<HTMLInputElement>("#image-file-input"),
  insertImageButton: queryElement<HTMLButtonElement>("#insert-image-btn"),
  jsonFileInput: queryElement<HTMLInputElement>("#json-file-input"),
  slideTitleInput: queryElement<HTMLInputElement>("#slide-title-input"),
  deckThemeSelect: queryElement<HTMLSelectElement>("#deck-theme-select"),
  deckAspectSelect: queryElement<HTMLSelectElement>("#deck-aspect-select"),
  slideBackgroundInput: queryElement<HTMLInputElement>("#slide-background-input"),
  backgroundSwatches: queryElement<HTMLElement>("#background-swatches"),
  elementInspector: queryElement<HTMLElement>("#element-inspector"),
  deleteElementButton: queryElement<HTMLButtonElement>("#delete-element-btn"),
  elementXInput: queryElement<HTMLInputElement>("#element-x-input"),
  elementYInput: queryElement<HTMLInputElement>("#element-y-input"),
  elementWidthInput: queryElement<HTMLInputElement>("#element-width-input"),
  elementHeightInput: queryElement<HTMLInputElement>("#element-height-input"),
  elementOpacityInput: queryElement<HTMLInputElement>("#element-opacity-input"),
  textFields: queryElement<HTMLElement>("#text-fields"),
  textContentInput: queryElement<HTMLTextAreaElement>("#text-content-input"),
  textSizeInput: queryElement<HTMLInputElement>("#text-size-input"),
  textWeightInput: queryElement<HTMLInputElement>("#text-weight-input"),
  textColorInput: queryElement<HTMLInputElement>("#text-color-input"),
  shapeFields: queryElement<HTMLElement>("#shape-fields"),
  shapeKindSelect: queryElement<HTMLSelectElement>("#shape-kind-select"),
  shapeFillInput: queryElement<HTMLInputElement>("#shape-fill-input"),
  shapeStrokeInput: queryElement<HTMLInputElement>("#shape-stroke-input"),
  imageFields: queryElement<HTMLElement>("#image-fields"),
  imageSrcInput: queryElement<HTMLInputElement>("#image-src-input"),
  imageAltInput: queryElement<HTMLInputElement>("#image-alt-input"),
  imageFitSelect: queryElement<HTMLSelectElement>("#image-fit-select"),
  layersList: queryElement<HTMLElement>("#layers-list"),
  layerFrontButton: queryElement<HTMLButtonElement>("#layer-front-btn"),
  layerForwardButton: queryElement<HTMLButtonElement>("#layer-forward-btn"),
  layerBackwardButton: queryElement<HTMLButtonElement>("#layer-backward-btn"),
  layerBackButton: queryElement<HTMLButtonElement>("#layer-back-btn"),
  templateDialog: queryElement<HTMLDialogElement>("#template-dialog"),
  templateNameInput: queryElement<HTMLInputElement>("#template-name-input"),
  saveTemplateConfirmButton: queryElement<HTMLButtonElement>("#save-template-confirm-btn"),
  exportDialog: queryElement<HTMLDialogElement>("#export-dialog"),
  exportStatus: queryElement<HTMLElement>("#export-status"),
  exportJsonAction: queryElement<HTMLButtonElement>("#export-json-action"),
  exportPortableAction: queryElement<HTMLButtonElement>("#export-portable-action"),
  exportPdfAction: queryElement<HTMLButtonElement>("#export-pdf-action"),
  exportPngAction: queryElement<HTMLButtonElement>("#export-png-action"),
  outlineDialog: queryElement<HTMLDialogElement>("#outline-dialog"),
  outlineInput: queryElement<HTMLTextAreaElement>("#outline-input"),
  createOutlineDeckButton: queryElement<HTMLButtonElement>("#create-outline-deck-btn"),
  commandDialog: queryElement<HTMLDialogElement>("#command-dialog"),
  commandInput: queryElement<HTMLInputElement>("#command-input"),
  commandList: queryElement<HTMLElement>("#command-list"),
  presenterDialog: queryElement<HTMLDialogElement>("#presenter-dialog"),
  presenterSlide: queryElement<HTMLElement>("#presenter-slide"),
  presenterMeta: queryElement<HTMLElement>("#presenter-meta"),
  presenterPrevButton: queryElement<HTMLButtonElement>("#presenter-prev-btn"),
  presenterNextButton: queryElement<HTMLButtonElement>("#presenter-next-btn"),
};

const userTemplatesStorageKey = "mikroslides.userTemplates";

const service = new DeckService(new IndexedDbDeckRepository());
const outlineService = new OutlineImportService();
const polishService = new DeckPolishService();
let activeDeck: MikroDeckRecord | null = null;
let libraryDecks: MikroDeckRecord[] = [];
let userTemplates: UserTemplate[] = [];
let selectedElementId: string | null = null;
let selectedElementIds: string[] = [];
let storageAvailable = true;
let autosaveTimer: number | null = null;
let toastTimer: number | null = null;
let dragState: DragState | null = null;
let selectionMarquee: SelectionMarqueeState | null = null;
let undoStack: MikroDeckRecord[] = [];
let redoStack: MikroDeckRecord[] = [];
let clipboardElements: SlideElement[] = [];
let editingTextElementId: string | null = null;
let presenterIndex = 0;
let pendingHistorySnapshot: MikroDeckRecord | null = null;
let commandPalette: CommandPalette | null = null;
let canvasZoom = 1;
let draggedSlideId: string | null = null;
let ignoreNextSlideClick = false;
let ignoreNextCanvasClick = false;

void boot();

async function boot() {
  applyTheme(loadTheme());
  applyFocusMode();
  userTemplates = loadUserTemplates();
  commandPalette = new CommandPalette({
    dialog: elements.commandDialog,
    input: elements.commandInput,
    list: elements.commandList,
    getActions: buildCommandActions,
    onError: (error) => showToast(formatError(error, "Command failed")),
  });
  bindEvents();
  renderBackgroundSwatches();
  renderTemplateOptions();
  renderDeckOptionControls();

  try {
    libraryDecks = await service.list();
    const storedId = localStorage.getItem("mikroslides.activeDeckId");
    const storedDeck = storedId
      ? (libraryDecks.find((deck) => deck.id === storedId) ?? undefined)
      : undefined;
    activeDeck = storedDeck ?? libraryDecks[0];
    if (!activeDeck) {
      activeDeck = await service.create({ title: "MikroSlides Deck" });
    }
    const recoveryDeck = loadRecoveryDraft();
    if (
      recoveryDeck &&
      recoveryDeck.id === activeDeck.id &&
      recoveryDeck.updatedAt.localeCompare(activeDeck.updatedAt) > 0
    ) {
      activeDeck = recoveryDeck;
      showToast("Recovered unsaved changes");
    }
  } catch (error) {
    storageAvailable = false;
    activeDeck = MikroDeck.create({ title: "Unsaved Deck" }).toRecord();
    showToast(formatError(error, "Browser storage is unavailable"));
  }

  const firstElementId = getActiveSlide()?.elements[0]?.id;
  selectElements(firstElementId ? [firstElementId] : []);
  renderAll();
  await refreshLibrary();
}

function bindEvents() {
  elements.deckTitleInput.addEventListener("input", () => {
    if (!activeDeck) {
      return;
    }

    stageHistory();
    activeDeck = MikroDeck.fromRecord(activeDeck)
      .update({ title: elements.deckTitleInput.value })
      .toRecord();
    commitDeckChange({ inspector: false });
  });

  elements.newDeckButton.addEventListener("click", () => void createDeck());
  elements.libraryButton.addEventListener("click", () => openDialog(elements.libraryDialog));
  elements.importJsonButton.addEventListener("click", () => elements.jsonFileInput.click());
  elements.outlineButton.addEventListener("click", openOutlineDialog);
  elements.polishButton.addEventListener("click", polishDeck);
  elements.exportButton.addEventListener("click", openExportDialog);
  elements.presentButton.addEventListener("click", openPresenter);
  elements.commandButton.addEventListener("click", openCommandPalette);
  elements.themeButton.addEventListener("click", toggleTheme);
  elements.addSlideButton.addEventListener("click", addSlide);
  elements.undoButton.addEventListener("click", undo);
  elements.redoButton.addEventListener("click", redo);
  elements.addTextButton.addEventListener("click", addTextElement);
  elements.addShapeButton.addEventListener("click", addShapeElement);
  elements.addImageButton.addEventListener("click", () => openDialog(elements.imageDialog));
  elements.templateSelect.addEventListener("change", applySelectedTemplate);
  elements.saveTemplateButton.addEventListener("click", openTemplateDialog);
  elements.duplicateElementButton.addEventListener("click", duplicateSelectedElement);
  elements.duplicateSlideButton.addEventListener("click", duplicateSlide);
  elements.deleteSlideButton.addEventListener("click", deleteSlide);
  elements.zoomOutButton.addEventListener("click", () => setCanvasZoom(canvasZoom - 0.15));
  elements.zoomFitButton.addEventListener("click", () => setCanvasZoom(1));
  elements.zoomInButton.addEventListener("click", () => setCanvasZoom(canvasZoom + 0.15));
  elements.deleteElementButton.addEventListener("click", deleteSelectedElement);
  elements.librarySearch.addEventListener("input", renderLibrary);
  elements.insertImageButton.addEventListener("click", () => void insertImageFromDialog());
  elements.jsonFileInput.addEventListener("change", importJsonFile);
  elements.slideTitleInput.addEventListener("input", () =>
    updateCurrentSlide({ title: elements.slideTitleInput.value }, { inspector: false }),
  );
  elements.deckThemeSelect.addEventListener("change", updateDeckTheme);
  elements.deckAspectSelect.addEventListener("change", updateDeckAspect);
  elements.slideBackgroundInput.addEventListener("input", () =>
    updateCurrentSlide({ background: elements.slideBackgroundInput.value }, { inspector: false }),
  );
  elements.speakerNotes.addEventListener("input", () =>
    updateCurrentSlide({ speakerNotes: elements.speakerNotes.value }, { inspector: false }),
  );
  elements.slideList.addEventListener("click", handleSlideListClick);
  elements.slideList.addEventListener("dragstart", handleSlideDragStart);
  elements.slideList.addEventListener("dragover", handleSlideDragOver);
  elements.slideList.addEventListener("drop", handleSlideDrop);
  elements.slideList.addEventListener("dragend", handleSlideDragEnd);
  elements.slideList.addEventListener("dragleave", handleSlideDragLeave);
  elements.deckList.addEventListener("click", (event) => void handleDeckListClick(event));
  elements.slideCanvas.addEventListener("pointerdown", handleCanvasPointerDown);
  elements.slideCanvas.addEventListener("click", handleCanvasClick);
  elements.slideCanvas.addEventListener("dblclick", handleCanvasDoubleClick);
  elements.slideCanvas.addEventListener("input", handleCanvasTextInput);
  elements.slideCanvas.addEventListener("focusout", handleCanvasFocusOut);
  elements.elementXInput.addEventListener("input", () =>
    updateSelectedElement({ x: readNumber(elements.elementXInput) }, { inspector: false }),
  );
  elements.elementYInput.addEventListener("input", () =>
    updateSelectedElement({ y: readNumber(elements.elementYInput) }, { inspector: false }),
  );
  elements.elementWidthInput.addEventListener("input", () =>
    updateSelectedElement({ width: readNumber(elements.elementWidthInput) }, { inspector: false }),
  );
  elements.elementHeightInput.addEventListener("input", () =>
    updateSelectedElement(
      { height: readNumber(elements.elementHeightInput) },
      { inspector: false },
    ),
  );
  elements.elementOpacityInput.addEventListener("input", () =>
    updateSelectedElement(
      { opacity: readNumber(elements.elementOpacityInput) },
      { inspector: false },
    ),
  );
  elements.textContentInput.addEventListener("input", () =>
    updateSelectedElement({ content: elements.textContentInput.value }, { inspector: false }),
  );
  elements.textSizeInput.addEventListener("input", () =>
    updateSelectedElement({ fontSize: readNumber(elements.textSizeInput) }, { inspector: false }),
  );
  elements.textWeightInput.addEventListener("input", () =>
    updateSelectedElement(
      { fontWeight: readNumber(elements.textWeightInput) },
      { inspector: false },
    ),
  );
  elements.textColorInput.addEventListener("input", () =>
    updateSelectedElement({ color: elements.textColorInput.value }, { inspector: false }),
  );
  elements.shapeKindSelect.addEventListener("change", () =>
    updateSelectedElement(
      { shape: elements.shapeKindSelect.value as SlideShapeKind },
      { inspector: false },
    ),
  );
  elements.shapeFillInput.addEventListener("input", () =>
    updateSelectedElement({ fill: elements.shapeFillInput.value }, { inspector: false }),
  );
  elements.shapeStrokeInput.addEventListener("input", () =>
    updateSelectedElement({ stroke: elements.shapeStrokeInput.value }, { inspector: false }),
  );
  elements.imageSrcInput.addEventListener("input", () =>
    updateSelectedElement({ src: elements.imageSrcInput.value }, { inspector: false }),
  );
  elements.imageAltInput.addEventListener("input", () =>
    updateSelectedElement({ alt: elements.imageAltInput.value }, { inspector: false }),
  );
  elements.imageFitSelect.addEventListener("change", () =>
    updateSelectedElement({ fit: elements.imageFitSelect.value as ImageFit }, { inspector: false }),
  );
  elements.presenterPrevButton.addEventListener("click", () => movePresenter(-1));
  elements.presenterNextButton.addEventListener("click", () => movePresenter(1));
  elements.presenterSlide.addEventListener("click", () => movePresenter(1));
  elements.presenterDialog.addEventListener("close", () => {
    if (document.fullscreenElement === elements.presenterDialog) {
      void document.exitFullscreen().catch(() => undefined);
    }
  });
  elements.layersList.addEventListener("click", handleLayerListClick);
  elements.layerFrontButton.addEventListener("click", () => reorderSelectedElements("front"));
  elements.layerForwardButton.addEventListener("click", () => reorderSelectedElements("forward"));
  elements.layerBackwardButton.addEventListener("click", () => reorderSelectedElements("backward"));
  elements.layerBackButton.addEventListener("click", () => reorderSelectedElements("back"));
  elements.saveTemplateConfirmButton.addEventListener("click", saveUserTemplateFromDialog);
  elements.exportJsonAction.addEventListener("click", exportJson);
  elements.exportPortableAction.addEventListener("click", () => void exportPortable());
  elements.exportPdfAction.addEventListener("click", exportPdf);
  elements.exportPngAction.addEventListener("click", () => void exportPng());
  elements.createOutlineDeckButton.addEventListener(
    "click",
    () => void createDeckFromOutlineText(elements.outlineInput.value),
  );

  document.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const closeDialogId = target?.closest<HTMLElement>("[data-close-dialog]")?.dataset.closeDialog;
    if (closeDialogId) {
      queryElement<HTMLDialogElement>(`#${closeDialogId}`).close();
      return;
    }

    const swatch = target?.closest<HTMLButtonElement>("[data-background]");
    if (swatch?.dataset.background) {
      updateCurrentSlide({ background: swatch.dataset.background });
      return;
    }

    const alignButton = target?.closest<HTMLButtonElement>("[data-align]");
    if (alignButton?.dataset.align) {
      updateSelectedElement({ align: alignButton.dataset.align as TextAlignment });
      return;
    }

    const objectAlignButton = target?.closest<HTMLButtonElement>("[data-object-align]");
    if (objectAlignButton?.dataset.objectAlign) {
      alignSelectedElements(objectAlignButton.dataset.objectAlign);
    }
  });

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerCancel);
  document.addEventListener("keydown", (event) => void handleKeyboard(event));
  document.addEventListener("paste", (event) => void handlePaste(event));
}

function renderAll(options: RenderOptions = {}) {
  renderDeckChrome();
  renderDeckHeader();
  renderHistoryControls();
  renderSlideList();
  renderCanvas();
  renderPrintDeck();
  renderPresenter();

  if (options.inspector !== false) {
    renderInspector();
  }

  if (options.library !== false) {
    renderLibrary();
  }
}

function renderHistoryControls() {
  elements.undoButton.disabled = undoStack.length === 0;
  elements.redoButton.disabled = redoStack.length === 0;
  elements.duplicateElementButton.disabled = selectedElementIds.length === 0;
  const canLayer = selectedElementIds.length > 0;
  elements.layerFrontButton.disabled = !canLayer;
  elements.layerForwardButton.disabled = !canLayer;
  elements.layerBackwardButton.disabled = !canLayer;
  elements.layerBackButton.disabled = !canLayer;
}

function renderDeckHeader() {
  if (!activeDeck) {
    return;
  }

  if (document.activeElement !== elements.deckTitleInput) {
    elements.deckTitleInput.value = activeDeck.title;
  }

  const activeSlideIndex = activeDeck.slides.findIndex(
    (slide) => slide.id === activeDeck?.activeSlideId,
  );
  const currentSlide = activeSlideIndex >= 0 ? activeSlideIndex + 1 : 1;
  elements.deckMeta.textContent = `Slide ${currentSlide}/${activeDeck.slides.length}`;
}

function renderDeckChrome() {
  const aspect = activeDeck?.aspectRatio ?? "16:9";
  const [width, height] = aspect.split(":").map(Number);
  const ratio = width / height;
  const printSize = printDimensionsForAspect(aspect);
  for (const target of [elements.appShell, elements.presenterDialog, elements.printDeck]) {
    target.style.setProperty("--deck-aspect-ratio", `${width} / ${height}`);
    target.style.setProperty("--deck-ratio", String(ratio));
  }
  elements.appShell.style.setProperty("--canvas-zoom", String(canvasZoom));
  elements.zoomFitButton.textContent = `${Math.round(canvasZoom * 100)}%`;
  elements.printDeck.style.setProperty("--print-width", printSize.width);
  elements.printDeck.style.setProperty("--print-height", printSize.height);
}

function renderDeckOptionControls() {
  elements.deckThemeSelect.innerHTML = builtInDeckThemes
    .map((theme) => `<option value="${theme.id}">${escapeHtml(theme.name)}</option>`)
    .join("");
  elements.deckAspectSelect.innerHTML = deckAspects
    .map((aspect) => `<option value="${aspect.id}">${escapeHtml(aspect.name)}</option>`)
    .join("");
}

function renderTemplateOptions() {
  const builtInOptions = builtInTemplates
    .map((template) => `<option value="${template.id}">${escapeHtml(template.name)}</option>`)
    .join("");
  const customOptions = userTemplates
    .map(
      (template) => `<option value="custom:${template.id}">${escapeHtml(template.name)}</option>`,
    )
    .join("");

  elements.templateSelect.innerHTML = `
    <option value="">Layout</option>
    <optgroup label="Built in">${builtInOptions}</optgroup>
    ${customOptions ? `<optgroup label="Mine">${customOptions}</optgroup>` : ""}
  `;
}

function renderSlideList() {
  if (!activeDeck) {
    elements.slideList.innerHTML = "";
    return;
  }

  elements.slideList.innerHTML = activeDeck.slides
    .map((slide, index) => {
      const current = slide.id === activeDeck?.activeSlideId;
      return `
        <button class="slide-thumb" type="button" draggable="true" data-slide-id="${escapeHtml(slide.id)}" aria-current="${current}">
          <span class="slide-number">${index + 1}</span>
          <span class="thumb-preview" style="--thumb-bg:${escapeAttribute(slide.background)}">
            ${renderSlideElements(slide, new Set(), false)}
          </span>
          <span class="thumb-title">${escapeHtml(slide.title)}</span>
        </button>
      `;
    })
    .join("");
}

function renderCanvas() {
  const slide = getActiveSlide();
  if (!slide) {
    elements.slideCanvas.innerHTML = "";
    return;
  }

  elements.slideCanvas.style.setProperty("--slide-bg", slide.background);
  elements.slideCanvas.innerHTML = renderSlideElements(slide, new Set(selectedElementIds), true);
}

function renderInspector() {
  const slide = getActiveSlide();
  if (!slide) {
    return;
  }

  if (document.activeElement !== elements.slideTitleInput) {
    elements.slideTitleInput.value = slide.title;
  }
  if (activeDeck && document.activeElement !== elements.deckThemeSelect) {
    elements.deckThemeSelect.value = activeDeck.theme.id;
  }
  if (activeDeck && document.activeElement !== elements.deckAspectSelect) {
    elements.deckAspectSelect.value = activeDeck.aspectRatio;
  }
  if (document.activeElement !== elements.slideBackgroundInput) {
    elements.slideBackgroundInput.value = toColorInput(slide.background);
  }
  if (document.activeElement !== elements.speakerNotes) {
    elements.speakerNotes.value = slide.speakerNotes;
  }

  const element = getSelectedElement();
  elements.elementInspector.hidden = !element;
  renderLayers();
  if (!element) {
    return;
  }

  setInputValue(elements.elementXInput, element.x);
  setInputValue(elements.elementYInput, element.y);
  setInputValue(elements.elementWidthInput, element.width);
  setInputValue(elements.elementHeightInput, element.height);
  setInputValue(elements.elementOpacityInput, element.opacity);

  setVisibleObjectFields(element.kind);

  if (element.kind === "text") {
    if (document.activeElement !== elements.textContentInput) {
      elements.textContentInput.value = element.content;
    }
    setInputValue(elements.textSizeInput, element.fontSize);
    setInputValue(elements.textWeightInput, element.fontWeight);
    elements.textColorInput.value = toColorInput(element.color);
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-align]")) {
      button.classList.toggle("is-active", button.dataset.align === element.align);
    }
  }

  if (element.kind === "shape") {
    elements.shapeKindSelect.value = element.shape;
    elements.shapeFillInput.value = toColorInput(element.fill);
    elements.shapeStrokeInput.value = toColorInput(element.stroke);
  }

  if (element.kind === "image") {
    if (document.activeElement !== elements.imageSrcInput) {
      elements.imageSrcInput.value = element.src;
    }
    if (document.activeElement !== elements.imageAltInput) {
      elements.imageAltInput.value = element.alt;
    }
    elements.imageFitSelect.value = element.fit;
  }
}

function renderLibrary() {
  const decks = service.search(libraryDecks, elements.librarySearch.value);
  elements.deckList.innerHTML = decks
    .map(
      (deck) => `
        <div class="deck-row" data-deck-id="${escapeHtml(deck.id)}">
          <button class="deck-row-main" type="button" data-action="open-deck">
            <span class="deck-row-title">${escapeHtml(deck.title)}</span>
            <span class="deck-row-meta">${deck.slides.length} slides / ${formatDate(deck.updatedAt)}</span>
          </button>
          <span class="deck-row-actions">
            <button class="tool-btn icon-btn" type="button" data-action="duplicate-deck" title="Duplicate" aria-label="Duplicate deck">
              <svg class="icon" aria-hidden="true"><use href="#icon-copy"></use></svg>
            </button>
            <button class="tool-btn icon-btn danger" type="button" data-action="delete-deck" title="Delete" aria-label="Delete deck">
              <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
            </button>
          </span>
        </div>
      `,
    )
    .join("");
}

function renderLayers() {
  const slide = getActiveSlide();
  if (!slide) {
    elements.layersList.innerHTML = "";
    return;
  }

  elements.layersList.innerHTML = slide.elements
    .map((element, index) => ({ element, index }))
    .reverse()
    .map(({ element, index }) => {
      const selected = selectedElementIds.includes(element.id);
      return `
        <button class="layer-row" type="button" data-layer-id="${escapeHtml(element.id)}" aria-pressed="${selected}">
          <svg class="icon" aria-hidden="true"><use href="#icon-layers"></use></svg>
          <span>${escapeHtml(getElementLabel(element, index))}</span>
        </button>
      `;
    })
    .join("");
}

function renderPrintDeck() {
  if (!activeDeck) {
    elements.printDeck.innerHTML = "";
    return;
  }

  elements.printDeck.innerHTML = activeDeck.slides
    .map(
      (slide) => `
        <section class="print-slide" style="--slide-bg:${escapeAttribute(slide.background)}">
          ${renderSlideElements(slide, new Set(), false)}
        </section>
      `,
    )
    .join("");
}

function renderPresenter() {
  if (!activeDeck || !elements.presenterDialog.open) {
    return;
  }

  presenterIndex = Math.max(0, Math.min(presenterIndex, activeDeck.slides.length - 1));
  const slide = activeDeck.slides[presenterIndex];
  elements.presenterSlide.style.setProperty("--slide-bg", slide.background);
  elements.presenterSlide.innerHTML = renderSlideElements(slide, new Set(), false);
  elements.presenterMeta.textContent = `${presenterIndex + 1} / ${activeDeck.slides.length} · ${slide.title}`;
  elements.presenterPrevButton.disabled = presenterIndex === 0;
  elements.presenterNextButton.disabled = presenterIndex === activeDeck.slides.length - 1;
}

function renderBackgroundSwatches() {
  elements.backgroundSwatches.innerHTML = backgroundSwatches
    .map(
      (color) =>
        `<button class="swatch-btn" type="button" data-background="${color}" style="--swatch:${color}" title="${color}" aria-label="${color}"></button>`,
    )
    .join("");
}

function cloneDeck(record: MikroDeckRecord) {
  return structuredClone(record);
}

function cloneSlideForTemplate(slide: MikroSlideRecord): MikroSlideRecord {
  return {
    ...structuredClone(slide),
    id: createId("template_slide"),
    elements: slide.elements.map((element) => structuredClone(element) as SlideElement),
  };
}

function cloneElementForInsertion(element: SlideElement): SlideElement {
  return {
    ...structuredClone(element),
    id: createId("el"),
  } as SlideElement;
}

function stageHistory() {
  if (!activeDeck || pendingHistorySnapshot) {
    return;
  }

  pendingHistorySnapshot = cloneDeck(activeDeck);
}

function flushHistorySnapshot() {
  if (!pendingHistorySnapshot) {
    return;
  }

  undoStack = [...undoStack, pendingHistorySnapshot].slice(-80);
  redoStack = [];
  pendingHistorySnapshot = null;
}

function clearHistory() {
  undoStack = [];
  redoStack = [];
  pendingHistorySnapshot = null;
}

function undo() {
  if (!activeDeck || undoStack.length === 0) {
    return;
  }

  const previous = undoStack[undoStack.length - 1];
  undoStack = undoStack.slice(0, -1);
  redoStack = [...redoStack, cloneDeck(activeDeck)].slice(-80);
  activeDeck = cloneDeck(previous);
  syncSelectionToActiveSlide();
  renderAll();
  scheduleAutosave();
}

function redo() {
  if (!activeDeck || redoStack.length === 0) {
    return;
  }

  const next = redoStack[redoStack.length - 1];
  redoStack = redoStack.slice(0, -1);
  undoStack = [...undoStack, cloneDeck(activeDeck)].slice(-80);
  activeDeck = cloneDeck(next);
  syncSelectionToActiveSlide();
  renderAll();
  scheduleAutosave();
}

function selectElements(ids: string[]) {
  const slide = getActiveSlide();
  const availableIds = new Set(slide?.elements.map((element) => element.id) ?? []);
  selectedElementIds = [...new Set(ids.filter((id) => availableIds.has(id)))];
  selectedElementId = selectedElementIds[0] ?? null;
}

function selectElementFromInteraction(elementId: string, multiSelect: boolean) {
  const isSelected = selectedElementIds.includes(elementId);
  if (multiSelect && isSelected) {
    selectElements(selectedElementIds.filter((id) => id !== elementId));
    return;
  }

  if (multiSelect) {
    selectElements([elementId, ...selectedElementIds]);
    return;
  }

  if (isSelected) {
    selectElements([elementId, ...selectedElementIds.filter((id) => id !== elementId)]);
    return;
  }

  selectElements([elementId]);
}

function isMultiSelectEvent(event: MouseEvent | PointerEvent) {
  return event.shiftKey || event.metaKey || event.ctrlKey;
}

function syncSelectionToActiveSlide() {
  const slide = getActiveSlide();
  if (!slide) {
    selectElements([]);
    return;
  }

  selectElements(
    selectedElementIds.filter((id) => slide.elements.some((element) => element.id === id)),
  );
  if (selectedElementIds.length === 0 && slide.elements[0]) {
    selectElements([slide.elements[0].id]);
  }
}

function renderSlideElements(
  slide: MikroSlideRecord,
  selectedIds: Set<string>,
  includeHandle: boolean,
) {
  return slide.elements
    .map((element) => renderSlideElement(element, selectedIds.has(element.id), includeHandle))
    .join("");
}

function renderSlideElement(element: SlideElement, selected: boolean, includeHandle: boolean) {
  const baseStyle = [
    `--x:${element.x}`,
    `--y:${element.y}`,
    `--w:${element.width}`,
    `--h:${element.height}`,
    `--rotation:${element.rotation}`,
    `--opacity:${element.opacity}`,
  ].join(";");
  const handle = includeHandle
    ? '<span class="element-resize-handle" data-resize="true"></span>'
    : "";
  const selectedAttr = selected ? "true" : "false";
  let body = "";

  if (element.kind === "text") {
    const isEditing = editingTextElementId === element.id;
    const fontFamily =
      element.fontFamily === "serif"
        ? "var(--font-serif)"
        : element.fontFamily === "mono"
          ? "var(--font-mono)"
          : "var(--font-family)";
    const style = [
      `--text-color:${escapeAttribute(element.color)}`,
      `--font-size-cqw:${element.fontSize / 10}cqw`,
      `--font-weight:${element.fontWeight}`,
      `--font-style:${element.italic ? "italic" : "normal"}`,
      `--text-align:${element.align}`,
      `--element-font:${fontFamily}`,
    ].join(";");
    body = `<div class="slide-text" data-text-editor="${element.id}" contenteditable="${isEditing}" spellcheck="true" style="${style}">${escapeHtml(element.content)}</div>`;
  }

  if (element.kind === "shape") {
    const style = [
      `--fill:${escapeAttribute(element.fill)}`,
      `--stroke:${escapeAttribute(element.stroke)}`,
      `--stroke-width:${element.strokeWidth}`,
      `--radius:${element.radius}`,
    ].join(";");
    body = `<div class="slide-shape" data-shape="${element.shape}" style="${style}"></div>`;
  }

  if (element.kind === "image") {
    const style = `--image-fit:${element.fit}`;
    body = element.src
      ? `<img class="slide-image" src="${escapeAttribute(element.src)}" alt="${escapeAttribute(element.alt)}" style="${style}" />`
      : `<div class="slide-image-placeholder" style="${style}">Image</div>`;
  }

  return `
    <div class="slide-element" data-element-id="${escapeHtml(element.id)}" data-kind="${element.kind}" data-selected="${selectedAttr}" style="${baseStyle}">
      ${body}
      ${handle}
    </div>
  `;
}

function getElementLabel(element: SlideElement, index: number) {
  if (element.kind === "text") {
    return element.content.trim().split(/\s+/).slice(0, 4).join(" ") || `Text ${index + 1}`;
  }

  if (element.kind === "image") {
    return element.alt || `Image ${index + 1}`;
  }

  return `${element.shape[0].toUpperCase()}${element.shape.slice(1)} ${index + 1}`;
}

function commitDeckChange(options: RenderOptions = {}) {
  if (options.history !== false) {
    flushHistorySnapshot();
  }
  persistRecoveryDraft();
  renderAll(options);
  scheduleAutosave();
}

async function saveDeck(snapshot = false) {
  if (!activeDeck || !storageAvailable) {
    return;
  }

  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }

  try {
    activeDeck = await service.save(activeDeck, {
      saveSnapshot: snapshot,
      snapshotReason: snapshot ? "manual" : undefined,
    });
    localStorage.setItem("mikroslides.activeDeckId", activeDeck.id);
    localStorage.removeItem("mikroslides.recoveryDraft");
    await refreshLibrary({ render: false });
  } catch (error) {
    showToast(formatError(error, "Could not save deck"));
  }
}

function scheduleAutosave() {
  if (!storageAvailable) {
    return;
  }

  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer);
  }

  autosaveTimer = window.setTimeout(() => void saveDeck(false), 450);
}

async function refreshLibrary(options: { render?: boolean } = {}) {
  if (!storageAvailable) {
    return;
  }

  libraryDecks = await service.list();
  if (options.render !== false) {
    renderLibrary();
  }
}

function updateDeckTheme() {
  if (!activeDeck) {
    return;
  }

  const theme =
    builtInDeckThemes.find((item) => item.id === elements.deckThemeSelect.value) ??
    defaultDeckTheme;
  const previousTheme = activeDeck.theme;
  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck)
    .update({
      theme,
      slides: activeDeck.slides.map((slide) => rethemeSlide(slide, previousTheme, theme)),
    })
    .toRecord();
  commitDeckChange();
}

function rethemeSlide(
  slide: MikroSlideRecord,
  previousTheme: typeof defaultDeckTheme,
  theme: typeof defaultDeckTheme,
) {
  return {
    ...slide,
    background: mapThemeColor(slide.background, previousTheme, theme),
    elements: slide.elements.map((element) => {
      if (element.kind === "text") {
        return { ...element, color: mapThemeColor(element.color, previousTheme, theme) };
      }

      if (element.kind === "shape") {
        return {
          ...element,
          fill: mapThemeColor(element.fill, previousTheme, theme),
          stroke: mapThemeColor(element.stroke, previousTheme, theme),
        };
      }

      return element;
    }),
  };
}

function mapThemeColor(
  color: string,
  previousTheme: typeof defaultDeckTheme,
  theme: typeof defaultDeckTheme,
) {
  const entries = [
    ["accent", theme.accent],
    ["background", theme.background],
    ["muted", theme.muted],
    ["surface", theme.surface],
    ["text", theme.text],
  ] as const;
  const match = entries.find(([key]) => color.toLowerCase() === previousTheme[key].toLowerCase());
  return match ? match[1] : color;
}

function updateDeckAspect() {
  if (!activeDeck) {
    return;
  }

  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck)
    .update({ aspectRatio: elements.deckAspectSelect.value as DeckAspectRatio })
    .toRecord();
  commitDeckChange();
}

function polishDeck() {
  if (!activeDeck) {
    return;
  }

  stageHistory();
  activeDeck = polishService.polish(activeDeck);
  selectFirstElement();
  commitDeckChange();
  showToast("Deck polished");
}

async function createDeck() {
  await saveDeck(false);
  try {
    activeDeck = await service.create({ title: "Untitled Deck" });
    selectFirstElement();
    clearHistory();
    localStorage.setItem("mikroslides.activeDeckId", activeDeck.id);
    await refreshLibrary({ render: false });
    renderAll();
  } catch (error) {
    showToast(formatError(error, "Could not create deck"));
  }
}

function openOutlineDialog() {
  elements.outlineInput.value ||=
    "# Launch Plan\n\n## Why now\n- Customer demand\n- Internal readiness\n\n## Next steps\n- Pilot\n- Measure\n- Roll out";
  openDialog(elements.outlineDialog);
  window.setTimeout(() => {
    elements.outlineInput.focus();
    elements.outlineInput.select();
  }, 0);
}

async function createDeckFromOutlineText(markdown: string) {
  const text = markdown.trim();
  if (!text) {
    showToast("Paste an outline first");
    return;
  }

  await saveDeck(false);
  try {
    activeDeck = outlineService.createDeckFromMarkdown(text, {
      aspectRatio: activeDeck?.aspectRatio ?? "16:9",
      theme: activeDeck?.theme ?? defaultDeckTheme,
    });
    if (storageAvailable) {
      activeDeck = await service.save(activeDeck, {
        saveSnapshot: true,
        snapshotReason: "import",
      });
      await refreshLibrary({ render: false });
    }
    selectFirstElement();
    clearHistory();
    localStorage.setItem("mikroslides.activeDeckId", activeDeck.id);
    elements.outlineDialog.close();
    renderAll();
    showToast("Deck created from outline");
  } catch (error) {
    showToast(formatError(error, "Could not create deck from outline"));
  }
}

function addSlide() {
  if (!activeDeck) {
    return;
  }

  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck).addSlide().toRecord();
  selectFirstElement();
  commitDeckChange();
}

function duplicateSlide() {
  if (!activeDeck) {
    return;
  }

  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck).duplicateSlide().toRecord();
  selectFirstElement();
  commitDeckChange();
}

function moveSlide(direction: -1 | 1) {
  if (!activeDeck) {
    return;
  }

  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck)
    .moveSlide(activeDeck.activeSlideId, direction)
    .toRecord();
  commitDeckChange();
}

function deleteSlide() {
  if (!activeDeck) {
    return;
  }

  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck).removeSlide().toRecord();
  selectFirstElement();
  commitDeckChange();
}

function addTextElement() {
  const slide = getActiveSlide();
  if (!activeDeck || !slide) {
    return;
  }

  const element = createTextElement({
    content: "New text",
    x: 16,
    y: 18 + slide.elements.length * 4,
    width: 46,
    height: 14,
  });
  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck).addElement(slide.id, element).toRecord();
  selectElements([element.id]);
  commitDeckChange();
}

function addShapeElement() {
  const slide = getActiveSlide();
  if (!activeDeck || !slide) {
    return;
  }

  const element = createShapeElement({
    x: 50,
    y: 36,
    width: 26,
    height: 20,
  });
  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck).addElement(slide.id, element).toRecord();
  selectElements([element.id]);
  commitDeckChange();
}

async function insertImageFromDialog() {
  const slide = getActiveSlide();
  if (!activeDeck || !slide) {
    return;
  }

  const file = elements.imageFileInput.files?.[0] ?? null;
  const src = file ? await readFileAsDataUrl(file) : elements.imageUrlInput.value.trim();
  if (!src) {
    showToast("Choose an image file or URL");
    return;
  }

  addImageToSlide(src, file?.name ?? "");
  elements.imageUrlInput.value = "";
  elements.imageFileInput.value = "";
  elements.imageDialog.close();
}

function addImageToSlide(
  src: string,
  alt: string,
  geometry: Partial<Pick<SlideElement, "x" | "y" | "width" | "height">> = {},
) {
  const slide = getActiveSlide();
  if (!activeDeck || !slide) {
    return;
  }

  const element = createImageElement({
    src,
    alt,
    x: geometry.x ?? 48,
    y: geometry.y ?? 20,
    width: geometry.width ?? 38,
    height: geometry.height ?? 44,
  });
  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck).addElement(slide.id, element).toRecord();
  selectElements([element.id]);
  commitDeckChange();
}

function deleteSelectedElement() {
  const slide = getActiveSlide();
  if (!activeDeck || !slide || selectedElementIds.length === 0) {
    return;
  }

  stageHistory();
  const nextSlides = activeDeck.slides.map((item) =>
    item.id === slide.id
      ? {
          ...item,
          elements: item.elements.filter((element) => !selectedElementIds.includes(element.id)),
        }
      : item,
  );
  activeDeck = MikroDeck.fromRecord(activeDeck).update({ slides: nextSlides }).toRecord();
  selectElements([]);
  commitDeckChange();
}

function duplicateSelectedElement() {
  const slide = getActiveSlide();
  const elementsToDuplicate = getSelectedElements();
  if (!activeDeck || !slide || elementsToDuplicate.length === 0) {
    return;
  }

  stageHistory();
  const duplicates = elementsToDuplicate.map(
    (element) =>
      ({
        ...structuredClone(element),
        id: createId("el"),
        x: element.x + 4,
        y: element.y + 4,
      }) as SlideElement,
  );
  const nextSlides = activeDeck.slides.map((item) =>
    item.id === slide.id ? { ...item, elements: [...item.elements, ...duplicates] } : item,
  );
  activeDeck = MikroDeck.fromRecord(activeDeck).update({ slides: nextSlides }).toRecord();
  selectElements(duplicates.map((element) => element.id));
  commitDeckChange();
}

function copySelectedElements() {
  const selected = getSelectedElements();
  if (selected.length === 0) {
    return;
  }

  clipboardElements = selected.map((element) => structuredClone(element));
  showToast(
    `${clipboardElements.length} object${clipboardElements.length === 1 ? "" : "s"} copied`,
  );
}

function cutSelectedElements() {
  if (selectedElementIds.length === 0) {
    return;
  }

  copySelectedElements();
  deleteSelectedElement();
}

async function handlePaste(event: ClipboardEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable;
  const item = [...(event.clipboardData?.items ?? [])].find((clipboardItem) =>
    clipboardItem.type.startsWith("image/"),
  );

  if (isTyping) {
    return;
  }

  const text = event.clipboardData?.getData("text/plain") ?? "";
  if (!item && text && outlineService.looksLikeOutline(text)) {
    event.preventDefault();
    await createDeckFromOutlineText(text);
    return;
  }

  if (!item) {
    if (clipboardElements.length > 0) {
      event.preventDefault();
      pasteElements();
    }
    return;
  }

  const file = item.getAsFile();
  const slide = getActiveSlide();
  if (!file || !activeDeck || !slide) {
    return;
  }

  event.preventDefault();
  const src = await readFileAsDataUrl(file);
  addImageToSlide(src, file.name || "Clipboard image", {
    x: 25,
    y: 18,
    width: 50,
    height: 56,
  });
  showToast("Image pasted");
}

function pasteElements() {
  const slide = getActiveSlide();
  if (!activeDeck || !slide || clipboardElements.length === 0) {
    return;
  }

  stageHistory();
  const pasted = clipboardElements.map(
    (element) =>
      ({
        ...structuredClone(element),
        id: createId("el"),
        x: Math.min(element.x + 5, 96),
        y: Math.min(element.y + 5, 96),
      }) as SlideElement,
  );
  const nextSlides = activeDeck.slides.map((item) =>
    item.id === slide.id ? { ...item, elements: [...item.elements, ...pasted] } : item,
  );
  activeDeck = MikroDeck.fromRecord(activeDeck).update({ slides: nextSlides }).toRecord();
  selectElements(pasted.map((element) => element.id));
  commitDeckChange();
}

function alignSelectedElements(alignment: string) {
  const selected = getSelectedElements();
  if (selected.length === 0) {
    return;
  }

  const updates = selected.map((element) => {
    if (alignment === "left") {
      return { id: element.id, patch: { x: 8 } };
    }

    if (alignment === "center") {
      return { id: element.id, patch: { x: 50 - element.width / 2 } };
    }

    if (alignment === "right") {
      return { id: element.id, patch: { x: 92 - element.width } };
    }

    if (alignment === "top") {
      return { id: element.id, patch: { y: 8 } };
    }

    if (alignment === "middle") {
      return { id: element.id, patch: { y: 50 - element.height / 2 } };
    }

    if (alignment === "bottom") {
      return { id: element.id, patch: { y: 92 - element.height } };
    }

    return { id: element.id, patch: {} };
  });
  updateSelectedElementGeometry(updates);
}

function applySelectedTemplate() {
  const template = elements.templateSelect.value;
  elements.templateSelect.value = "";
  if (!template) {
    return;
  }

  const slide = getActiveSlide();
  if (!activeDeck || !slide) {
    return;
  }

  stageHistory();
  const templateSlide = template.startsWith("custom:")
    ? createUserTemplateSlide(template.replace(/^custom:/, ""), slide)
    : createTemplateSlide(template, slide, activeDeck.theme);
  if (!templateSlide) {
    showToast("Template not found");
    pendingHistorySnapshot = null;
    return;
  }

  activeDeck = MikroDeck.fromRecord(activeDeck)
    .updateSlide(slide.id, {
      title: templateSlide.title,
      layout: templateSlide.layout,
      background: templateSlide.background,
      transition: templateSlide.transition,
      elements: templateSlide.elements,
    })
    .toRecord();
  selectFirstElement();
  commitDeckChange();
}

function openTemplateDialog() {
  const slide = getActiveSlide();
  if (!slide) {
    return;
  }

  elements.templateNameInput.value = slide.title || "Untitled template";
  openDialog(elements.templateDialog);
  window.setTimeout(() => {
    elements.templateNameInput.focus();
    elements.templateNameInput.select();
  }, 0);
}

function saveUserTemplateFromDialog() {
  const slide = getActiveSlide();
  if (!slide) {
    return;
  }

  const name = elements.templateNameInput.value.trim() || slide.title || "Untitled template";
  userTemplates = [
    {
      id: createId("template"),
      name,
      slide: cloneSlideForTemplate(slide),
      createdAt: new Date().toISOString(),
    },
    ...userTemplates,
  ].slice(0, 24);
  saveUserTemplates();
  renderTemplateOptions();
  elements.templateDialog.close();
  showToast("Template saved");
}

function createUserTemplateSlide(templateId: string, base: MikroSlideRecord) {
  const template = userTemplates.find((item) => item.id === templateId);
  if (!template) {
    return null;
  }

  return {
    ...base,
    title: template.slide.title,
    layout: template.slide.layout,
    background: template.slide.background,
    transition: template.slide.transition,
    elements: template.slide.elements.map(cloneElementForInsertion),
  };
}

function updateCurrentSlide(patch: Partial<MikroSlideRecord>, options: RenderOptions = {}) {
  const slide = getActiveSlide();
  if (!activeDeck || !slide) {
    return;
  }

  if (options.history !== false) {
    stageHistory();
  }
  activeDeck = MikroDeck.fromRecord(activeDeck).updateSlide(slide.id, patch).toRecord();
  commitDeckChange(options);
}

function updateSelectedElement(patch: Partial<SlideElement>, options: RenderOptions = {}) {
  const slide = getActiveSlide();
  const element = getSelectedElement();
  if (!activeDeck || !slide || !element) {
    return;
  }

  if (options.history !== false) {
    stageHistory();
  }
  activeDeck = MikroDeck.fromRecord(activeDeck)
    .updateElement(slide.id, element.id, patch)
    .toRecord();
  commitDeckChange(options);
}

function updateSelectedElementGeometry(
  updates: Array<{ id: string; patch: Partial<SlideElement> }>,
  options: RenderOptions = {},
) {
  const slide = getActiveSlide();
  if (!activeDeck || !slide || updates.length === 0) {
    return;
  }

  if (options.history !== false) {
    stageHistory();
  }

  const patches = new Map(updates.map((update) => [update.id, update.patch]));
  const nextSlides = activeDeck.slides.map((item) =>
    item.id === slide.id
      ? {
          ...item,
          elements: item.elements.map((element) => ({
            ...element,
            ...(patches.get(element.id) ?? {}),
          })) as SlideElement[],
        }
      : item,
  );
  activeDeck = MikroDeck.fromRecord(activeDeck).update({ slides: nextSlides }).toRecord();
  commitDeckChange(options);
}

function handleSlideListClick(event: MouseEvent) {
  if (ignoreNextSlideClick) {
    event.preventDefault();
    ignoreNextSlideClick = false;
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  const button = target?.closest<HTMLButtonElement>("[data-slide-id]");
  const slideId = button?.dataset.slideId;
  if (!activeDeck || !slideId) {
    return;
  }

  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck).setActiveSlide(slideId).toRecord();
  selectFirstElement();
  commitDeckChange();
}

type SlideDropPlacement = "before" | "after";

function handleSlideDragStart(event: DragEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const button = target?.closest<HTMLButtonElement>("[data-slide-id]");
  const slideId = button?.dataset.slideId;
  if (!activeDeck || !slideId) {
    return;
  }

  draggedSlideId = slideId;
  button.classList.add("is-dragging");
  event.dataTransfer?.setData("text/plain", slideId);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function handleSlideDragOver(event: DragEvent) {
  if (!draggedSlideId) {
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  const button = target?.closest<HTMLButtonElement>("[data-slide-id]");
  const slideId = button?.dataset.slideId;
  if (!button || !slideId || slideId === draggedSlideId) {
    clearSlideDropIndicators();
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  setSlideDropIndicator(button, getSlideDropPlacement(event, button));
}

function handleSlideDrop(event: DragEvent) {
  if (!draggedSlideId) {
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  const button = target?.closest<HTMLButtonElement>("[data-slide-id]");
  const targetSlideId = button?.dataset.slideId;
  if (!button || !targetSlideId) {
    handleSlideDragEnd();
    return;
  }

  event.preventDefault();
  const placement = getSlideDropPlacement(event, button);
  const slideId = draggedSlideId;
  handleSlideDragEnd();
  reorderSlide(slideId, targetSlideId, placement);
  ignoreNextSlideClick = true;
  window.setTimeout(() => {
    ignoreNextSlideClick = false;
  }, 250);
}

function handleSlideDragEnd() {
  draggedSlideId = null;
  for (const button of elements.slideList.querySelectorAll<HTMLElement>(".slide-thumb")) {
    button.classList.remove("is-dragging");
    delete button.dataset.dropPosition;
  }
}

function handleSlideDragLeave(event: DragEvent) {
  if (event.relatedTarget instanceof Node && elements.slideList.contains(event.relatedTarget)) {
    return;
  }

  clearSlideDropIndicators();
}

function getSlideDropPlacement(event: DragEvent, button: HTMLElement): SlideDropPlacement {
  const rect = button.getBoundingClientRect();
  const horizontal = rect.width > rect.height * 1.25;
  const midpoint = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
  const pointer = horizontal ? event.clientX : event.clientY;
  return pointer < midpoint ? "before" : "after";
}

function setSlideDropIndicator(button: HTMLElement, placement: SlideDropPlacement) {
  clearSlideDropIndicators();
  button.dataset.dropPosition = placement;
}

function clearSlideDropIndicators() {
  for (const button of elements.slideList.querySelectorAll<HTMLElement>(".slide-thumb")) {
    delete button.dataset.dropPosition;
  }
}

function reorderSlide(
  draggedSlideIdValue: string,
  targetSlideId: string,
  placement: SlideDropPlacement,
) {
  if (!activeDeck || draggedSlideIdValue === targetSlideId) {
    return;
  }

  const slides = activeDeck.slides.slice();
  const fromIndex = slides.findIndex((slide) => slide.id === draggedSlideIdValue);
  const targetIndex = slides.findIndex((slide) => slide.id === targetSlideId);
  if (fromIndex < 0 || targetIndex < 0) {
    return;
  }

  const [slide] = slides.splice(fromIndex, 1);
  let insertIndex = targetIndex;
  if (fromIndex < targetIndex) {
    insertIndex -= 1;
  }
  if (placement === "after") {
    insertIndex += 1;
  }
  insertIndex = Math.max(0, Math.min(insertIndex, slides.length));
  if (insertIndex === fromIndex) {
    return;
  }

  slides.splice(insertIndex, 0, slide);
  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck)
    .update({ slides, activeSlideId: draggedSlideIdValue })
    .toRecord();
  selectFirstElement();
  commitDeckChange();
}

function handleLayerListClick(event: MouseEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const button = target?.closest<HTMLButtonElement>("[data-layer-id]");
  const layerId = button?.dataset.layerId;
  if (!layerId) {
    return;
  }

  selectElementFromInteraction(layerId, isMultiSelectEvent(event));
  renderCanvas();
  renderInspector();
}

function reorderSelectedElements(action: "front" | "forward" | "backward" | "back") {
  const slide = getActiveSlide();
  if (!activeDeck || !slide || selectedElementIds.length === 0) {
    return;
  }

  const selected = new Set(selectedElementIds);
  let elements = slide.elements.slice();

  if (action === "front") {
    elements = [
      ...elements.filter((element) => !selected.has(element.id)),
      ...elements.filter((element) => selected.has(element.id)),
    ];
  }

  if (action === "back") {
    elements = [
      ...elements.filter((element) => selected.has(element.id)),
      ...elements.filter((element) => !selected.has(element.id)),
    ];
  }

  if (action === "forward") {
    for (let index = elements.length - 2; index >= 0; index -= 1) {
      if (selected.has(elements[index].id) && !selected.has(elements[index + 1].id)) {
        [elements[index], elements[index + 1]] = [elements[index + 1], elements[index]];
      }
    }
  }

  if (action === "backward") {
    for (let index = 1; index < elements.length; index += 1) {
      if (selected.has(elements[index].id) && !selected.has(elements[index - 1].id)) {
        [elements[index], elements[index - 1]] = [elements[index - 1], elements[index]];
      }
    }
  }

  stageHistory();
  activeDeck = MikroDeck.fromRecord(activeDeck).updateSlide(slide.id, { elements }).toRecord();
  selectElements(selectedElementIds);
  commitDeckChange();
}

async function handleDeckListClick(event: MouseEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const row = target?.closest<HTMLElement>("[data-deck-id]");
  const action = target?.closest<HTMLElement>("[data-action]")?.dataset.action;
  const deckId = row?.dataset.deckId;
  if (!deckId || !action) {
    return;
  }

  if (action === "open-deck") {
    await openDeck(deckId);
    elements.libraryDialog.close();
    return;
  }

  if (action === "duplicate-deck") {
    await service.duplicate(deckId);
    await refreshLibrary();
    showToast("Deck duplicated");
    return;
  }

  if (action === "delete-deck") {
    await service.delete(deckId);
    if (activeDeck?.id === deckId) {
      activeDeck = (await service.list())[0] ?? (await service.create({ title: "Untitled Deck" }));
      selectFirstElement();
      clearHistory();
      localStorage.setItem("mikroslides.activeDeckId", activeDeck.id);
      renderAll();
    }
    await refreshLibrary();
    showToast("Deck deleted");
  }
}

async function openDeck(deckId: string) {
  await saveDeck(false);
  const deck = await service.load(deckId);
  if (!deck) {
    showToast("Deck not found");
    return;
  }

  activeDeck = deck;
  selectFirstElement();
  clearHistory();
  localStorage.setItem("mikroslides.activeDeckId", deck.id);
  renderAll();
}

function handleCanvasClick(event: MouseEvent) {
  if (ignoreNextCanvasClick) {
    event.preventDefault();
    ignoreNextCanvasClick = false;
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  const elementNode = target?.closest<HTMLElement>("[data-element-id]");
  if (!elementNode && target === elements.slideCanvas && !isMultiSelectEvent(event)) {
    selectElements([]);
    renderCanvas();
    renderInspector();
  }
}

function handleCanvasDoubleClick(event: MouseEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const textEditor = target?.closest<HTMLElement>("[data-text-editor]");
  const elementId = textEditor?.dataset.textEditor;
  if (!elementId) {
    return;
  }

  selectElements([elementId]);
  editingTextElementId = elementId;
  stageHistory();
  renderCanvas();
  renderInspector();
  window.setTimeout(() => {
    const editor = elements.slideCanvas.querySelector<HTMLElement>(
      `[data-text-editor="${CSS.escape(elementId)}"]`,
    );
    editor?.focus();
    selectEditableContents(editor);
  }, 0);
  event.preventDefault();
}

function handleCanvasTextInput(event: Event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const textEditor = target?.closest<HTMLElement>("[data-text-editor]");
  const elementId = textEditor?.dataset.textEditor;
  const slide = getActiveSlide();
  if (!activeDeck || !slide || !elementId || editingTextElementId !== elementId) {
    return;
  }

  const text = textEditor.innerText.replace(/\n\n+/g, "\n").trimEnd();
  activeDeck = MikroDeck.fromRecord(activeDeck)
    .updateElement(slide.id, elementId, { content: text } as Partial<TextSlideElement>)
    .toRecord();
  persistRecoveryDraft();
  renderInspector();
  renderPrintDeck();
  scheduleAutosave();
}

function handleCanvasFocusOut(event: FocusEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target?.closest("[data-text-editor]")) {
    return;
  }

  editingTextElementId = null;
  flushHistorySnapshot();
  renderCanvas();
  renderInspector();
}

function handleCanvasPointerDown(event: PointerEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (target?.closest('[contenteditable="true"]')) {
    return;
  }

  const elementNode = target?.closest<HTMLElement>("[data-element-id]");
  if (!elementNode) {
    startSelectionMarquee(event);
    return;
  }

  const elementId = elementNode.dataset.elementId;
  const element = getActiveSlide()?.elements.find((item) => item.id === elementId);
  if (!elementId || !element) {
    return;
  }

  const isResize = Boolean(target?.closest("[data-resize]"));
  const multiSelect = isMultiSelectEvent(event);
  if (multiSelect && selectedElementIds.includes(elementId) && !isResize) {
    selectElements(selectedElementIds.filter((id) => id !== elementId));
    renderCanvas();
    renderInspector();
    event.preventDefault();
    return;
  }

  selectElementFromInteraction(elementId, multiSelect);
  stageHistory();
  dragState = {
    elementId,
    mode: isResize ? "resize" : "move",
    kind: element.kind,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: element.x,
    startY: element.y,
    startWidth: element.width,
    startHeight: element.height,
    aspectRatio: element.width / Math.max(element.height, 1),
    selectedStarts: getSelectedElements().map((item) => ({
      id: item.id,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    })),
  };
  trySetCanvasPointerCapture(event.pointerId);
  renderCanvas();
  renderInspector();
  event.preventDefault();
}

function handlePointerMove(event: PointerEvent) {
  if (selectionMarquee) {
    updateSelectionMarquee(event);
    return;
  }

  if (!dragState) {
    return;
  }

  const rect = elements.slideCanvas.getBoundingClientRect();
  const dx = ((event.clientX - dragState.startClientX) / rect.width) * 100;
  const dy = ((event.clientY - dragState.startClientY) / rect.height) * 100;

  if (dragState.mode === "move") {
    updateSelectedElementGeometry(
      dragState.selectedStarts.map((item) => ({
        id: item.id,
        patch: {
          x: Math.round((item.x + dx) * 10) / 10,
          y: Math.round((item.y + dy) * 10) / 10,
        },
      })),
      { inspector: false, library: false, history: false },
    );
    return;
  }

  let nextWidth = Math.max(1, dragState.startWidth + dx);
  let nextHeight = Math.max(1, dragState.startHeight + dy);

  if (event.shiftKey && dragState.kind === "image") {
    if (
      Math.abs(event.clientX - dragState.startClientX) >=
      Math.abs(event.clientY - dragState.startClientY)
    ) {
      nextHeight = nextWidth / Math.max(dragState.aspectRatio, 0.01);
    } else {
      nextWidth = nextHeight * dragState.aspectRatio;
    }
  }

  updateSelectedElementGeometry(
    [
      {
        id: dragState.elementId,
        patch: {
          width: Math.round(nextWidth * 10) / 10,
          height: Math.round(nextHeight * 10) / 10,
        },
      },
    ],
    { inspector: false, library: false, history: false },
  );
}

function handlePointerUp(event: PointerEvent) {
  if (selectionMarquee) {
    finishSelectionMarquee(event);
    return;
  }

  if (!dragState) {
    return;
  }

  dragState = null;
  flushHistorySnapshot();
  renderCanvas();
  renderInspector();
}

function handlePointerCancel(event: PointerEvent) {
  if (selectionMarquee) {
    finishSelectionMarquee(event);
    return;
  }

  if (dragState) {
    handlePointerUp(event);
  }
}

function startSelectionMarquee(event: PointerEvent) {
  if (!getActiveSlide() || event.button !== 0) {
    return;
  }

  const start = getCanvasPointPercent(event.clientX, event.clientY);
  const box = document.createElement("div");
  box.className = "selection-marquee";
  box.setAttribute("aria-hidden", "true");
  elements.slideCanvas.append(box);

  selectionMarquee = {
    pointerId: event.pointerId,
    startX: start.x,
    startY: start.y,
    additive: isMultiSelectEvent(event),
    originIds: selectedElementIds,
    box,
  };

  updateSelectionMarquee(event);
  trySetCanvasPointerCapture(event.pointerId);
  event.preventDefault();
}

function updateSelectionMarquee(event: PointerEvent) {
  if (!selectionMarquee || selectionMarquee.pointerId !== event.pointerId) {
    return;
  }

  const rect = getSelectionMarqueeRect(event.clientX, event.clientY);
  setSelectionMarqueeBox(rect);
  const matchedIds = getElementIdsInRect(rect);
  const nextIds = selectionMarquee.additive
    ? [...selectionMarquee.originIds, ...matchedIds]
    : matchedIds;
  selectElements(nextIds);
  syncCanvasSelectionAttributes();
}

function finishSelectionMarquee(event: PointerEvent) {
  if (!selectionMarquee || selectionMarquee.pointerId !== event.pointerId) {
    return;
  }

  updateSelectionMarquee(event);
  selectionMarquee.box.remove();
  selectionMarquee = null;
  ignoreNextCanvasClick = true;
  tryReleaseCanvasPointerCapture(event.pointerId);
  renderCanvas();
  renderInspector();
  renderHistoryControls();
}

function getSelectionMarqueeRect(clientX: number, clientY: number): PercentRect {
  const point = getCanvasPointPercent(clientX, clientY);
  const startX = selectionMarquee?.startX ?? point.x;
  const startY = selectionMarquee?.startY ?? point.y;
  const x = Math.min(startX, point.x);
  const y = Math.min(startY, point.y);

  return {
    x,
    y,
    width: Math.abs(point.x - startX),
    height: Math.abs(point.y - startY),
  };
}

function getCanvasPointPercent(clientX: number, clientY: number) {
  const rect = elements.slideCanvas.getBoundingClientRect();
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
  };
}

function setSelectionMarqueeBox(rect: PercentRect) {
  if (!selectionMarquee) {
    return;
  }

  selectionMarquee.box.style.setProperty("--marquee-x", String(rect.x));
  selectionMarquee.box.style.setProperty("--marquee-y", String(rect.y));
  selectionMarquee.box.style.setProperty("--marquee-w", String(rect.width));
  selectionMarquee.box.style.setProperty("--marquee-h", String(rect.height));
}

function getElementIdsInRect(rect: PercentRect) {
  const slide = getActiveSlide();
  if (!slide || rect.width < 0.1 || rect.height < 0.1) {
    return [];
  }

  return slide.elements
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

function rectsIntersect(left: PercentRect, right: PercentRect) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function syncCanvasSelectionAttributes() {
  const selected = new Set(selectedElementIds);
  for (const node of elements.slideCanvas.querySelectorAll<HTMLElement>("[data-element-id]")) {
    const elementId = node.dataset.elementId;
    node.dataset.selected = String(Boolean(elementId && selected.has(elementId)));
  }
}

function trySetCanvasPointerCapture(pointerId: number) {
  try {
    elements.slideCanvas.setPointerCapture(pointerId);
  } catch {
    // Safari can be fussy if capture is requested after a synthetic pointer transfer.
  }
}

function tryReleaseCanvasPointerCapture(pointerId: number) {
  try {
    if (elements.slideCanvas.hasPointerCapture(pointerId)) {
      elements.slideCanvas.releasePointerCapture(pointerId);
    }
  } catch {
    // Capture may already be released by the browser on pointerup.
  }
}

function openCommandPalette() {
  commandPalette?.open();
}

function buildCommandActions(): CommandAction[] {
  const layoutCommands = builtInTemplates.map((template) => ({
    id: `layout-${template.id}`,
    title: `Apply ${template.name}`,
    detail: "Change the current slide layout",
    keywords: `template layout slide ${template.name}`,
    run: () => {
      elements.templateSelect.value = template.id;
      applySelectedTemplate();
    },
  }));

  return [
    {
      id: "new-deck",
      title: "New deck",
      detail: "Create a fresh local deck",
      keywords: "create file",
      shortcut: "Cmd/Ctrl+N",
      run: () => createDeck(),
    },
    {
      id: "open-library",
      title: "Open library",
      detail: "Show locally stored decks",
      keywords: "decks files recent",
      run: () => openDialog(elements.libraryDialog),
    },
    {
      id: "outline-deck",
      title: "Deck from outline",
      detail: "Create slides from pasted Markdown",
      keywords: "markdown import notes gamma",
      run: openOutlineDialog,
    },
    {
      id: "polish-deck",
      title: "Polish deck",
      detail: "Tighten layout, spacing, and type scale",
      keywords: "beautify tidy align layout",
      run: polishDeck,
    },
    {
      id: "new-slide",
      title: "New slide",
      detail: "Add a slide after the current one",
      run: addSlide,
    },
    {
      id: "duplicate-slide",
      title: "Duplicate slide",
      detail: "Copy the current slide",
      shortcut: "Cmd/Ctrl+D",
      run: duplicateSlide,
    },
    {
      id: "delete-slide",
      title: "Delete slide",
      detail: "Remove the current slide",
      run: deleteSlide,
    },
    {
      id: "move-slide-up",
      title: "Move slide up",
      detail: "Move the current slide earlier",
      run: () => moveSlide(-1),
    },
    {
      id: "move-slide-down",
      title: "Move slide down",
      detail: "Move the current slide later",
      run: () => moveSlide(1),
    },
    {
      id: "add-text",
      title: "Add text",
      detail: "Insert a text box",
      run: addTextElement,
    },
    {
      id: "add-image",
      title: "Add image",
      detail: "Insert a local or remote image",
      run: () => openDialog(elements.imageDialog),
    },
    {
      id: "add-shape",
      title: "Add shape",
      detail: "Insert a simple shape",
      run: addShapeElement,
    },
    {
      id: "speaker-notes",
      title: "Add speaker notes",
      detail: "Focus notes for the current slide",
      run: () => elements.speakerNotes.focus(),
    },
    {
      id: "present",
      title: "Present",
      detail: "Start presentation mode",
      shortcut: "Cmd/Ctrl+Enter",
      run: openPresenter,
    },
    {
      id: "open-export",
      title: "Export",
      detail: "Choose JSON, portable, PDF, or PNG",
      keywords: "download save file",
      run: openExportDialog,
    },
    {
      id: "export-json",
      title: "Export JSON",
      detail: "Download editable MikroSlides data",
      run: exportJson,
    },
    {
      id: "export-portable",
      title: "Export portable file",
      detail: "Download a self-contained MikroSlides file",
      run: exportPortable,
    },
    {
      id: "export-pdf",
      title: "Export PDF",
      detail: "Use the browser print/PDF flow",
      shortcut: "Cmd/Ctrl+P",
      run: exportPdf,
    },
    {
      id: "export-png",
      title: "Export PNG",
      detail: "Download the current slide as an image",
      keywords: "image current slide",
      run: exportPng,
    },
    {
      id: "toggle-theme",
      title: "Toggle app theme",
      detail: "Switch light or dark chrome",
      run: toggleTheme,
    },
    {
      id: "undo",
      title: "Undo",
      detail: "Revert the last slide edit",
      shortcut: "Cmd/Ctrl+Z",
      run: undo,
    },
    {
      id: "redo",
      title: "Redo",
      detail: "Reapply the last reverted edit",
      shortcut: "Cmd/Ctrl+Shift+Z",
      run: redo,
    },
    ...layoutCommands,
  ];
}

async function handleKeyboard(event: KeyboardEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable;

  if (elements.presenterDialog.open) {
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      movePresenter(1);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      movePresenter(-1);
      return;
    }

    if (event.key === "Escape") {
      elements.presenterDialog.close();
      return;
    }
  }

  const isModifierShortcut = event.metaKey || event.ctrlKey;
  if (
    !elements.commandDialog.open &&
    ((isModifierShortcut && event.key.toLowerCase() === "k") || (!isTyping && event.key === "/"))
  ) {
    event.preventDefault();
    openCommandPalette();
    return;
  }

  if (elements.commandDialog.open) {
    return;
  }

  if (isModifierShortcut && event.key === "Enter") {
    event.preventDefault();
    openPresenter();
    return;
  }

  if (isModifierShortcut && event.key.toLowerCase() === "p") {
    event.preventDefault();
    exportPdf();
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    await saveDeck(true);
    showToast("Deck saved");
    return;
  }

  if (isModifierShortcut && event.key.toLowerCase() === "n") {
    event.preventDefault();
    await createDeck();
    return;
  }

  if (isModifierShortcut && event.key.toLowerCase() === "z" && !event.shiftKey) {
    event.preventDefault();
    undo();
    return;
  }

  if (
    (isModifierShortcut && event.key.toLowerCase() === "z" && event.shiftKey) ||
    (isModifierShortcut && event.key.toLowerCase() === "y")
  ) {
    event.preventDefault();
    redo();
    return;
  }

  if (isModifierShortcut && event.key.toLowerCase() === "c" && !isTyping) {
    event.preventDefault();
    copySelectedElements();
    return;
  }

  if (isModifierShortcut && event.key.toLowerCase() === "x" && !isTyping) {
    event.preventDefault();
    cutSelectedElements();
    return;
  }

  if (isModifierShortcut && event.key.toLowerCase() === "d" && !isTyping) {
    event.preventDefault();
    if (selectedElementIds.length > 0) {
      duplicateSelectedElement();
    } else {
      duplicateSlide();
    }
    return;
  }

  if (isModifierShortcut && event.key.toLowerCase() === "a" && !isTyping) {
    event.preventDefault();
    selectElements(getActiveSlide()?.elements.map((element) => element.id) ?? []);
    renderCanvas();
    renderInspector();
    return;
  }

  if (isTyping) {
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    if (selectedElementIds.length > 0) {
      event.preventDefault();
      deleteSelectedElement();
    }
    return;
  }

  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) &&
    selectedElementIds.length > 0
  ) {
    event.preventDefault();
    const step = event.shiftKey ? 5 : 1;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    updateSelectedElementGeometry(
      getSelectedElements().map((element) => ({
        id: element.id,
        patch: {
          x: element.x + dx,
          y: element.y + dy,
        },
      })),
    );
  }
}

function openExportDialog() {
  renderExportStatus();
  openDialog(elements.exportDialog);
}

function renderExportStatus() {
  if (!activeDeck) {
    elements.exportStatus.textContent = "No active deck.";
    elements.exportJsonAction.disabled = true;
    elements.exportPortableAction.disabled = true;
    elements.exportPdfAction.disabled = true;
    elements.exportPngAction.disabled = true;
    return;
  }

  const slide = getActiveSlide();
  const imageSources = activeDeck.slides.flatMap((deckSlide) =>
    deckSlide.elements.flatMap((element) =>
      element.kind === "image" && element.src ? [element.src] : [],
    ),
  );
  const localImages = imageSources.filter((src) => src.startsWith("data:")).length;
  const remoteImages = imageSources.filter(isRemoteImageSource).length;
  const details = [
    `${activeDeck.slides.length} ${activeDeck.slides.length === 1 ? "slide" : "slides"}`,
    activeDeck.aspectRatio,
  ];

  if (localImages > 0) {
    details.push(`${localImages} embedded ${localImages === 1 ? "image" : "images"}`);
  }

  if (remoteImages > 0) {
    details.push(`${remoteImages} remote ${remoteImages === 1 ? "image" : "images"}`);
  }

  elements.exportStatus.textContent = slide
    ? `${details.join(" / ")} / Current: ${slide.title}`
    : details.join(" / ");
  elements.exportJsonAction.disabled = false;
  elements.exportPortableAction.disabled = false;
  elements.exportPdfAction.disabled = false;
  elements.exportPngAction.disabled = !slide;
}

function closeExportDialog() {
  if (elements.exportDialog.open) {
    elements.exportDialog.close();
  }
}

function isRemoteImageSource(src: string) {
  if (!src || src.startsWith("data:") || src.startsWith("asset:")) {
    return false;
  }

  try {
    const url = new URL(src, window.location.href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function exportJson() {
  if (!activeDeck) {
    return;
  }

  downloadText(
    `${toFileSlug(activeDeck.title)}.mikroslides.json`,
    service.exportJson(activeDeck),
    "application/json;charset=utf-8",
  );
  closeExportDialog();
  showToast("MikroSlides JSON exported");
}

async function exportPortable() {
  if (!activeDeck) {
    return;
  }

  elements.exportPortableAction.disabled = true;
  elements.exportPortableAction.setAttribute("aria-busy", "true");
  try {
    const externalAssets = await collectRemoteImageAssets(activeDeck);
    downloadText(
      `${toFileSlug(activeDeck.title)}.mikroslides`,
      service.exportPortable(activeDeck, externalAssets.assets),
      "application/vnd.mikroslides+json;charset=utf-8",
    );
    closeExportDialog();
    showToast(
      externalAssets.failed > 0
        ? `Portable file exported; ${externalAssets.failed} remote asset${externalAssets.failed === 1 ? "" : "s"} could not be embedded`
        : "Portable MikroSlides file exported",
    );
  } catch (error) {
    showToast(formatError(error, "Could not export portable file"));
  } finally {
    elements.exportPortableAction.disabled = false;
    elements.exportPortableAction.removeAttribute("aria-busy");
  }
}

function exportPdf() {
  if (!activeDeck) {
    return;
  }

  renderPrintDeck();
  syncPrintPageStyle(activeDeck.aspectRatio);
  closeExportDialog();
  const originalTitle = document.title;
  document.title = activeDeck.title;
  window.setTimeout(() => {
    window.print();
    document.title = originalTitle;
  }, 60);
}

async function exportPng() {
  if (!activeDeck) {
    return;
  }

  const slide = getActiveSlide();
  if (!slide) {
    return;
  }

  elements.exportPngAction.disabled = true;
  elements.exportPngAction.setAttribute("aria-busy", "true");
  try {
    const png = await renderSlideToPng(slide, activeDeck.aspectRatio, { scale: 2 });
    downloadBytes(
      `${toFileSlug(activeDeck.title)}-${toFileSlug(slide.title)}.png`,
      png,
      "image/png",
    );
    closeExportDialog();
    showToast("Current slide exported as PNG");
  } catch (error) {
    showToast(formatError(error, "Could not export PNG"));
  } finally {
    elements.exportPngAction.disabled = false;
    elements.exportPngAction.removeAttribute("aria-busy");
  }
}

function syncPrintPageStyle(aspectRatio: DeckAspectRatio) {
  const id = "mikroslides-print-page-style";
  const existing = document.querySelector<HTMLStyleElement>(`#${id}`);
  const style = existing ?? document.createElement("style");
  style.id = id;
  style.textContent = printCssForAspect(aspectRatio);
  if (!existing) {
    document.head.append(style);
  }
}

function openPresenter() {
  if (!activeDeck) {
    return;
  }

  presenterIndex = Math.max(
    0,
    activeDeck.slides.findIndex((slide) => slide.id === activeDeck?.activeSlideId),
  );
  openDialog(elements.presenterDialog);
  renderPresenter();
  if (!document.fullscreenElement) {
    void elements.presenterDialog.requestFullscreen?.().catch(() => undefined);
  }
  window.setTimeout(() => elements.presenterSlide.focus(), 0);
}

function movePresenter(direction: -1 | 1) {
  if (!activeDeck) {
    return;
  }

  presenterIndex = Math.max(0, Math.min(presenterIndex + direction, activeDeck.slides.length - 1));
  renderPresenter();
}

async function importJsonFile(event: Event) {
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await readFileAsText(file);
    activeDeck = await service.importJson(text);
    selectFirstElement();
    clearHistory();
    localStorage.setItem("mikroslides.activeDeckId", activeDeck.id);
    await refreshLibrary({ render: false });
    renderAll();
    showToast("Deck imported");
  } catch (error) {
    showToast(formatError(error, "Could not import JSON"));
  } finally {
    input.value = "";
  }
}

function getActiveSlide() {
  if (!activeDeck) {
    return null;
  }

  return activeDeck.slides.find((slide) => slide.id === activeDeck?.activeSlideId) ?? null;
}

function getSelectedElement() {
  const slide = getActiveSlide();
  if (!slide || !selectedElementId) {
    return null;
  }

  return slide.elements.find((element) => element.id === selectedElementId) ?? null;
}

function getSelectedElements() {
  const slide = getActiveSlide();
  if (!slide) {
    return [];
  }

  return selectedElementIds
    .map((id) => slide.elements.find((element) => element.id === id))
    .filter((element): element is SlideElement => Boolean(element));
}

function selectFirstElement() {
  const firstElementId = getActiveSlide()?.elements[0]?.id;
  selectElements(firstElementId ? [firstElementId] : []);
}

function setVisibleObjectFields(kind: SlideElement["kind"]) {
  elements.textFields.dataset.visible = String(kind === "text");
  elements.shapeFields.dataset.visible = String(kind === "shape");
  elements.imageFields.dataset.visible = String(kind === "image");
}

function persistRecoveryDraft() {
  if (!activeDeck) {
    return;
  }

  try {
    localStorage.setItem("mikroslides.recoveryDraft", JSON.stringify(activeDeck));
  } catch {
    // Recovery is best-effort and should never block editing.
  }
}

function loadRecoveryDraft() {
  try {
    const value = localStorage.getItem("mikroslides.recoveryDraft");
    if (!value) {
      return null;
    }

    return MikroDeck.fromRecord(JSON.parse(value) as MikroDeckRecord).toRecord();
  } catch {
    localStorage.removeItem("mikroslides.recoveryDraft");
    return null;
  }
}

function openDialog(dialog: HTMLDialogElement) {
  if (!dialog.open) {
    dialog.showModal();
  }
}

function readNumber(input: HTMLInputElement) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function setInputValue(input: HTMLInputElement, value: number) {
  if (document.activeElement !== input) {
    input.value = String(Math.round(value * 100) / 100);
  }
}

function selectEditableContents(element: HTMLElement | null) {
  if (!element) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function showToast(message: string) {
  elements.toast.textContent = message;
  elements.toast.dataset.visible = "true";
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    elements.toast.dataset.visible = "false";
  }, 2600);
}

function formatError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function toColorInput(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
}

function toFileSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "mikroslides"
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function applyFocusMode() {
  elements.appShell.dataset.focusMode = "true";
}

function setCanvasZoom(value: number) {
  canvasZoom = Math.min(2.4, Math.max(0.55, Math.round(value * 100) / 100));
  renderDeckChrome();
}

function normalizeUserTemplate(value: unknown): UserTemplate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<UserTemplate>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || !candidate.slide) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name.trim() || "Untitled template",
    slide: createBlankSlide(candidate.slide),
    createdAt:
      typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
  };
}

function loadUserTemplates() {
  try {
    const value = localStorage.getItem(userTemplatesStorageKey);
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeUserTemplate)
      .filter((template): template is UserTemplate => Boolean(template))
      .slice(0, 24);
  } catch {
    localStorage.removeItem(userTemplatesStorageKey);
    return [];
  }
}

function saveUserTemplates() {
  try {
    localStorage.setItem(userTemplatesStorageKey, JSON.stringify(userTemplates));
  } catch {
    showToast("Could not save template locally");
  }
}

function loadTheme() {
  return (
    localStorage.getItem("mikroslides.theme") ??
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
}

function applyTheme(theme: string) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  elements.html.dataset.theme = nextTheme;
  elements.themeIcon.setAttribute("href", nextTheme === "dark" ? "#icon-sun" : "#icon-moon");
  localStorage.setItem("mikroslides.theme", nextTheme);
}

function toggleTheme() {
  applyTheme(elements.html.dataset.theme === "dark" ? "light" : "dark");
}
