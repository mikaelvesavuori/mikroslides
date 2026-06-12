import { readFileAsText } from "../config/index.js";
import {
  type DeckAspectRatio,
  DeckService,
  IndexedDbDeckRepository,
  MikroDeck,
  type MikroDeckRecord,
  type MikroSlideRecord,
  OutlineImportService,
  type ShapeSlideElement,
  type SlideElement,
  type SlideShapeKind,
  type TextListStyle,
} from "../index.js";
import { createId, nowIso } from "../shared/index.js";
import { createAppChromeController } from "./appChromeController.js";
import { createMikroSlidesElements, queryMikroSlidesElement } from "./appElements.js";
import { type AppEventHandlers, bindAppEvents } from "./appEvents.js";
import { createToastController, formatError, openDialog } from "./appFeedback.js";
import { createAssetController } from "./assetController.js";
import { createCanvasController } from "./canvasController.js";
import { createClipboardImageController } from "./clipboardImageController.js";
import { createCommandController } from "./commandController.js";
import { createContextMenuController } from "./contextMenuController.js";
import { createDeckActionsController } from "./deckActionsController.js";
import type { ObjectAlignment } from "./deckMutations.js";
import { backgroundSwatches, builtInDeckThemes, deckAspects } from "./deckOptions.js";
import { createDeckPersistenceController } from "./deckPersistenceController.js";
import { createDeckRenderController } from "./deckRenderController.js";
import {
  activeDeckStorageKey,
  rememberActiveDeckId,
  selectInitialDeck,
  shouldUseRecoveryDraft,
} from "./deckSession.js";
import {
  createDeckStateController,
  type DeckStateRenderOptions as RenderOptions,
} from "./deckStateController.js";
import { createExportController } from "./exportController.js";
import { createFontDeckController } from "./fontDeckController.js";
import { createFontManager } from "./fontManager.js";
import { cssFontStackForFont } from "./fontRuntime.js";
import { createFontRuntimeController } from "./fontRuntimeController.js";
import { createPresenterController } from "./presenterController.js";
import { renderShapeSelector, type ShapeSelectorTool } from "./shapeSelectorView.js";
import { createSlideContextMenuController } from "./slideContextMenuController.js";
import { builtInTemplates } from "./slideLayouts.js";
import { createSlideListInteraction } from "./slideListInteraction.js";
import type { SlideDropPlacement } from "./slideReorder.js";
import { createTemplateOutlineController } from "./templateOutlineController.js";
import { createUserTemplateStorageController } from "./userTemplateStorageController.js";
import type { UserTemplate } from "./userTemplates.js";

const elements = createMikroSlidesElements();

const service = new DeckService(new IndexedDbDeckRepository());
const outlineService = new OutlineImportService();
const toastController = createToastController(elements.toast);
const userTemplateStorageController = createUserTemplateStorageController({
  localStorage,
  showToast,
});
let libraryDecks: MikroDeckRecord[] = [];
let userTemplates: UserTemplate[] = [];
let activeShapeTool: ShapeSelectorTool = "rect";
let storageAvailable = true;

const deckStateController = createDeckStateController({
  persistRecoveryDraft,
  renderAll,
  scheduleAutosave,
});

const appChromeController = createAppChromeController({
  elements,
  localStorage,
  prefersDarkMode: () => matchMedia("(prefers-color-scheme: dark)").matches,
  renderDeckChrome,
});

const assetController = createAssetController({
  createAssetId: () => createId("asset"),
  getDeck: () => deckStateController.getDeck(),
  getStorageAvailable: () => storageAvailable,
  loadAsset: (assetId) => service.loadAsset(assetId),
  now: nowIso,
  renderFontRuntimeStyles,
  saveAsset: (asset) => service.saveAsset(asset),
});

const fontRuntimeController = createFontRuntimeController({
  getDeck: () => deckStateController.getDeck(),
  objectUrlForAsset: (assetId) => assetController.objectUrlForAsset(assetId),
});

const fontDeckController = createFontDeckController({
  commitDeckMutation,
  createStoredFontAsset,
  deleteAsset: (assetId) => service.deleteAsset(assetId),
  deleteObjectUrl: (assetId) => {
    assetController.deleteObjectUrl(assetId);
  },
  getDeck: () => deckStateController.getDeck(),
  getSelectedElementIds: () => deckStateController.getSelectedElementIds(),
  getSelectedElements,
  setDeck: (deck) => {
    deckStateController.setDeck(deck);
  },
  showToast,
});

const fontManager = createFontManager({
  elements,
  getDeck: () => deckStateController.getDeck(),
  selectedTextElementCount: () => fontDeckController.selectedTextElementCount(),
  selectedTextFontFamily: () => fontDeckController.selectedTextFontFamily(),
  cssFontStackForFont,
  cssFontStackForTextToken: (fontFamily) =>
    fontRuntimeController.cssFontStackForTextToken(fontFamily),
  importLocalFont: (file, label) => fontDeckController.importLocalFont(file, label),
  addBunnyFontFamily: (family) => fontDeckController.addBunnyFontFamily(family),
  addSourceFont: (font) => fontDeckController.addSourceFont(font),
  applyFontToken: (fontFamily) => fontDeckController.applyFontTokenToSelectedText(fontFamily),
  deleteFont: (fontId) => fontDeckController.deleteDeckFont(fontId),
  formatError,
  openDialog,
  showToast,
});

const exportController = createExportController({
  documentRef: document,
  elements,
  fontsReady: () => document.fonts.ready,
  formatError,
  getDeck: () => deckStateController.getDeck(),
  getSlide: getActiveSlide,
  loadAsset: (assetId) => service.loadAsset(assetId),
  renderPrintDeck,
  resolveFontFamily: (fontFamily) => fontRuntimeController.canvasFontStackForTextToken(fontFamily),
  resolveImageSource,
  serializeDeck: (deck) => service.exportJson(deck),
  serializePortableDeck: (deck, assets) => service.exportPortable(deck, assets),
  showToast,
  windowRef: window,
});

const clipboardImageController = createClipboardImageController({
  commitDeckMutation,
  createDeckFromOutlineText,
  createStoredImageAsset,
  deleteSelectedElement,
  elements,
  formatError,
  getDeck: () => deckStateController.getDeck(),
  getSelectedElements,
  getSlide: getActiveSlide,
  looksLikeOutline: (text) => outlineService.looksLikeOutline(text),
  showToast,
});

const deckPersistenceController = createDeckPersistenceController({
  clearHistory,
  formatError,
  getDeck: () => deckStateController.getDeck(),
  getStorageAvailable: () => storageAvailable,
  localStorage,
  readFileAsText,
  renderAll,
  renderLibrary,
  selectSlide,
  service,
  setDeck: (deck) => {
    deckStateController.setDeck(deck);
  },
  setLibraryDecks: (decks) => {
    libraryDecks = decks;
  },
  showToast,
  syncAssetObjectUrls: () => syncAssetObjectUrls(),
  windowRef: window,
});

const deckActionsController = createDeckActionsController({
  commitDeckMutation,
  getDeck: () => deckStateController.getDeck(),
  getSelectedElementIds: () => deckStateController.getSelectedElementIds(),
  getSelectedElements,
  getSlide: getActiveSlide,
  renderCanvas,
  renderInspector,
  selectElements,
  showToast,
});

const contextMenuController = createContextMenuController({
  actions: {
    "add-image": () => openDialog(elements.imageDialog),
    "add-shape": addShapeElement,
    "add-text": addTextElement,
    "bring-front": () => reorderSelectedElements("front"),
    copy: copySelectedElements,
    cut: cutSelectedElements,
    delete: deleteSelectedElement,
    duplicate: duplicateSelectedElement,
    lock: () => updateSelectedElement({ locked: true }),
    paste: pasteElements,
    "send-back": () => reorderSelectedElements("back"),
    unlock: () => updateSelectedElement({ locked: false }),
  },
  contextMenu: elements.contextMenu,
  getState: () => ({
    hasClipboard: clipboardImageController.hasClipboard(),
    hasLockedSelection: getSelectedElements().some((element) => element.locked),
    hasSelection: deckStateController.getSelectedElementIds().length > 0,
    hasUnlockedSelection: getSelectedElements().some((element) => !element.locked),
  }),
  viewport: () => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }),
});

const slideContextMenuController = createSlideContextMenuController({
  actions: {
    copy: (slideId) => withSlideContextSelection(slideId, copySlide),
    cut: (slideId) => withSlideContextSelection(slideId, cutSlide),
    delete: (slideId) => withSlideContextSelection(slideId, deleteSlide),
    duplicate: (slideId) => withSlideContextSelection(slideId, duplicateSlide),
    "move-down": (slideId) => withSlideContextSelection(slideId, () => moveSlide(1)),
    "move-up": (slideId) => withSlideContextSelection(slideId, () => moveSlide(-1)),
    "paste-after": (slideId) => withSlideContextSelection(slideId, pasteSlide),
    "toggle-skip": (slideId) => toggleSlideSkipped(slideId),
  },
  contextMenu: elements.slideContextMenu,
  getState: getSlideContextMenuState,
  viewport: () => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }),
});

const canvasController = createCanvasController({
  canvas: elements.slideCanvas,
  closeContextMenu,
  documentRef: document,
  flushHistorySnapshot,
  getDeck: () => deckStateController.getDeck(),
  getSelectedElementIds: () => deckStateController.getSelectedElementIds(),
  getSelectedElements,
  getSlide: getActiveSlide,
  openContextMenu,
  persistRecoveryDraft,
  renderCanvas,
  renderHistoryControls,
  renderInspector,
  renderPrintDeck,
  scheduleAutosave,
  selectElements,
  setDeck: (deck) => {
    deckStateController.setDeck(deck);
  },
  stageHistory,
  updateSelectedElementGeometry,
  windowRef: window,
});

const templateOutlineController = createTemplateOutlineController({
  clearHistory,
  commitDeckMutation,
  createDeckFromMarkdown: (markdown, options) =>
    outlineService.createDeckFromMarkdown(markdown, options),
  elements,
  formatError,
  getDeck: () => deckStateController.getDeck(),
  getSlide: getActiveSlide,
  getStorageAvailable: () => storageAvailable,
  getUserTemplates: () => userTemplates,
  localStorage,
  refreshLibrary,
  rememberDeck: rememberActiveDeckId,
  renderAll,
  renderTemplateOptions,
  saveCurrentDeck: saveDeck,
  saveDeckRecord: (deck, options) => service.save(deck, options),
  saveUserTemplates,
  selectSlide,
  setDeck: (deck) => {
    deckStateController.setDeck(deck);
  },
  setUserTemplates: (templates) => {
    userTemplates = templates;
  },
  showToast,
  syncAssetObjectUrls: () => syncAssetObjectUrls(),
  windowRef: window,
});

const slideListInteraction = createSlideListInteraction({
  hasDeck: () => deckStateController.hasDeck(),
  onCopySlide: copySlide,
  onCutSlide: cutSlide,
  onDeleteSlide: deleteSlide,
  onOpenSlideContextMenu: openSlideContextMenu,
  onPasteSlide: pasteSlide,
  onReorderSlide: reorderSlide,
  onSelectSlide: selectSlideById,
  onToggleSlideSkipped: toggleSlideSkipped,
  slideList: elements.slideList,
});

const deckRenderController = createDeckRenderController({
  backgroundSwatches,
  deckAspects,
  documentRef: document,
  elements,
  getCanvasZoom: () => appChromeController.getCanvasZoom(),
  getDeck: () => deckStateController.getDeck(),
  getEditingTextElementId: () => canvasController.getEditingTextElementId(),
  getSelectedElementIds: () => deckStateController.getSelectedElementIds(),
  getSelectedElements,
  getSlide: getActiveSlide,
  getUserTemplates: () => userTemplates,
  librarySearch: (query) => service.search(libraryDecks, query),
  renderFontRuntimeStyles,
  resolveFontStack: (fontFamily) => fontRuntimeController.cssFontStackForTextToken(fontFamily),
  resolveImageSource,
  themes: builtInDeckThemes,
  templates: builtInTemplates,
});

const commandController = createCommandController({
  callbacks: {
    addImage: () => openDialog(elements.imageDialog),
    addShape: addShapeElement,
    addSlide,
    addText: addTextElement,
    applySelectedTemplate,
    closeContextMenu,
    closePresenter: () => elements.presenterDialog.close(),
    copySelection: copySelectedElements,
    createDeck,
    cutSelection: cutSelectedElements,
    deleteSelection: deleteSelectedElement,
    deleteSlide,
    duplicateSelectedElement,
    duplicateSlide,
    exportJson,
    exportPdf,
    exportPng,
    exportPortable,
    movePresenter,
    moveSlide,
    openExport: openExportDialog,
    openLibrary: () => openDialog(elements.libraryDialog),
    openOutline: openOutlineDialog,
    openPresenter,
    redo,
    renderCanvas,
    renderInspector,
    saveDeck,
    selectElements,
    showToast,
    toggleTheme,
    undo,
    updateSelectedElementGeometry,
  },
  contextMenuOpen: () => contextMenuController.isOpen() || slideContextMenuController.isOpen(),
  elements,
  formatError,
  getSelectedElementIds: () => deckStateController.getSelectedElementIds(),
  getSelectedElements,
  getSlide: getActiveSlide,
  templates: builtInTemplates,
});

const presenterController = createPresenterController({
  documentRef: document,
  getDeck: () => deckStateController.getDeck(),
  openDialog,
  presenterDialog: elements.presenterDialog,
  presenterMeta: elements.presenterMeta,
  presenterNextButton: elements.presenterNextButton,
  presenterPrevButton: elements.presenterPrevButton,
  presenterSlide: elements.presenterSlide,
  resolveFontStack: (fontFamily) => fontRuntimeController.cssFontStackForTextToken(fontFamily),
  resolveImageSource,
  windowRef: window,
});

const appEventHandlers = {
  addShapeElement,
  addSlide,
  addTextElement,
  alignSelectedElements,
  applySelectedTemplate,
  closeContextMenu,
  createDeck,
  createDeckFromOutlineText,
  deleteSelectedElement,
  deleteSlide,
  duplicateSelectedElement,
  duplicateSlide,
  exportJson,
  exportPdf,
  exportPng,
  exportPortable,
  getCanvasZoom: () => appChromeController.getCanvasZoom(),
  handleCanvasClick,
  handleCanvasContextMenu,
  handleCanvasDoubleClick,
  handleCanvasDragOver,
  handleCanvasDrop,
  handleCanvasFocusOut,
  handleCanvasPointerDown,
  handleCanvasTextInput,
  handleContextMenuClick,
  handleDeckListClick,
  handleKeyboard,
  handleLayerListClick,
  handlePaste,
  handlePointerCancel,
  handlePointerMove,
  handlePointerUp,
  handleSlideDragEnd: slideListInteraction.handleDragEnd,
  handleSlideDragLeave: slideListInteraction.handleDragLeave,
  handleSlideDragOver: slideListInteraction.handleDragOver,
  handleSlideDragStart: slideListInteraction.handleDragStart,
  handleSlideDrop: slideListInteraction.handleDrop,
  handleSlideContextMenuClick,
  handleSlideListClick: slideListInteraction.handleClick,
  handleSlideListContextMenu: slideListInteraction.handleContextMenu,
  handleSlideListKeyDown: slideListInteraction.handleKeyDown,
  importJsonFile,
  insertImageFromDialog,
  movePresenter,
  openCommandPalette,
  openDialog,
  openExportDialog,
  openFontDialog,
  openOutlineDialog,
  openPresenter,
  openTemplateDialog,
  queryDialog: queryMikroSlidesElement,
  renderLibrary,
  reorderSelectedElements,
  saveUserTemplateFromDialog,
  setCanvasZoom,
  toggleSelectedTextListStyle,
  toggleTheme,
  undo,
  redo,
  updateCurrentSlide,
  updateDeckAspect,
  updateDeckTheme,
  updateDeckTitle,
  updateSelectedElement,
} satisfies AppEventHandlers;

void boot();

async function boot() {
  applyTheme(loadTheme());
  applyFocusMode();
  userTemplates = loadUserTemplates();
  renderShapeTools();
  bindEvents();
  renderBackgroundSwatches();
  renderTemplateOptions();
  renderDeckOptionControls();

  try {
    libraryDecks = await service.list();
    deckStateController.setDeck(
      selectInitialDeck(libraryDecks, localStorage.getItem(activeDeckStorageKey)),
    );
    if (!deckStateController.getDeck()) {
      deckStateController.setDeck(await service.create({ title: "MikroSlides Deck" }));
    }
    const activeDeck = deckStateController.getDeck();
    const recoveryDeck = activeDeck ? await loadRecoveryDraft(activeDeck.id) : null;
    if (shouldUseRecoveryDraft(activeDeck, recoveryDeck)) {
      deckStateController.setDeck(recoveryDeck);
      showToast("Recovered unsaved changes");
    }
  } catch (error) {
    storageAvailable = false;
    deckStateController.setDeck(MikroDeck.create({ title: "Unsaved Deck" }).toRecord());
    showToast(formatError(error, "Browser storage is unavailable"));
  }

  selectSlide();
  await syncAssetObjectUrls();
  renderAll();
  await refreshLibrary();
}

function bindEvents() {
  bindAppEvents(elements, fontManager, appEventHandlers);
}

function renderAll(options: RenderOptions = {}) {
  renderDeckChrome();
  renderFontRuntimeStyles();
  renderDeckHeader();
  renderHistoryControls();
  renderTemplateOptions();
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

  if (elements.fontDialog.open) {
    fontManager.render();
  }
}

function renderHistoryControls() {
  deckRenderController.renderHistoryControls(
    deckStateController.canUndo,
    deckStateController.canRedo,
  );
}

function renderDeckHeader() {
  deckRenderController.renderDeckHeader();
}

function renderDeckChrome() {
  deckRenderController.renderDeckChrome();
}

function renderDeckOptionControls() {
  deckRenderController.renderDeckOptionControls();
}

function renderTemplateOptions() {
  deckRenderController.renderTemplateOptions();
}

function renderSlideList() {
  deckRenderController.renderSlideList();
}

function renderCanvas() {
  deckRenderController.renderCanvas();
}

function renderInspector() {
  deckRenderController.renderInspector();
}

function renderLibrary() {
  deckRenderController.renderLibrary();
}

function renderPrintDeck() {
  deckRenderController.renderPrintDeck();
}

function renderFontRuntimeStyles() {
  fontRuntimeController.renderFontRuntimeStyles();
}

function renderPresenter() {
  presenterController.render();
}

function renderBackgroundSwatches() {
  deckRenderController.renderBackgroundSwatches();
}

function renderShapeTools() {
  renderShapeSelector({
    activeShape: activeShapeTool,
    currentShapeIcon: elements.currentShapeIcon,
    shapeOptions: elements.shapeOptions,
  });
}

function stageHistory() {
  deckStateController.stageHistory();
}

function flushHistorySnapshot() {
  deckStateController.flushHistorySnapshot();
}

function clearHistory() {
  deckStateController.clearHistory();
}

function undo() {
  deckStateController.undo();
}

function redo() {
  deckStateController.redo();
}

function selectElements(ids: string[]) {
  deckStateController.selectElements(ids);
}

function commitDeckMutation(
  result:
    | MikroDeckRecord
    | {
        deck: MikroDeckRecord;
        selectedElementIds?: string[];
      }
    | null,
  options: RenderOptions = {},
) {
  return deckStateController.commitDeckMutation(result, options);
}

async function saveDeck(snapshot = false) {
  await deckPersistenceController.saveDeck(snapshot);
}

function scheduleAutosave() {
  deckPersistenceController.scheduleAutosave();
}

async function refreshLibrary(options: { render?: boolean } = {}) {
  await deckPersistenceController.refreshLibrary(options);
}

function updateDeckTitle(title: string) {
  deckActionsController.updateDeckTitle(title);
}

function updateDeckTheme() {
  deckActionsController.updateDeckTheme(elements.deckThemeSelect.value);
}

function updateDeckAspect() {
  deckActionsController.updateDeckAspect(elements.deckAspectSelect.value as DeckAspectRatio);
}

async function createDeck() {
  await deckPersistenceController.createDeck();
}

function openOutlineDialog() {
  templateOutlineController.openOutlineDialog();
}

async function createDeckFromOutlineText(markdown: string) {
  await templateOutlineController.createDeckFromOutlineText(markdown);
}

function addSlide() {
  deckActionsController.addSlide();
}

function duplicateSlide() {
  deckActionsController.duplicateSlide();
}

function copySlide() {
  deckActionsController.copySlide();
}

function cutSlide() {
  deckActionsController.cutSlide();
}

function pasteSlide() {
  deckActionsController.pasteSlide();
}

function moveSlide(direction: -1 | 1) {
  deckActionsController.moveSlide(direction);
}

function deleteSlide() {
  deckActionsController.deleteSlide();
}

function addTextElement() {
  deckActionsController.addTextElement();
}

function addShapeElement(shape?: ShapeSelectorTool) {
  if (shape) {
    activeShapeTool = shape;
    renderShapeTools();
  }
  const tool = shape ?? activeShapeTool;
  const shapeKind: SlideShapeKind = tool === "arrow" ? "line" : tool;
  const patch: Partial<ShapeSlideElement> = tool === "arrow" ? { arrowHead: "end" } : {};
  deckActionsController.addShapeElement(shapeKind, patch);
}

function alignSelectedElements(alignment: ObjectAlignment) {
  deckActionsController.alignSelectedElements(alignment);
}

async function insertImageFromDialog() {
  await clipboardImageController.insertImageFromDialog();
}

function deleteSelectedElement() {
  deckActionsController.deleteSelectedElement();
}

function duplicateSelectedElement() {
  deckActionsController.duplicateSelectedElement();
}

function copySelectedElements() {
  clipboardImageController.copySelectedElements();
}

function cutSelectedElements() {
  clipboardImageController.cutSelectedElements();
}

async function handlePaste(event: ClipboardEvent) {
  await clipboardImageController.handlePaste(event);
}

function handleCanvasDragOver(event: DragEvent) {
  clipboardImageController.handleDragOver(event);
}

async function handleCanvasDrop(event: DragEvent) {
  await clipboardImageController.handleDrop(event);
}

function pasteElements() {
  clipboardImageController.pasteElements();
}

function toggleSelectedTextListStyle(style: TextListStyle) {
  deckActionsController.toggleSelectedTextListStyle(style);
}

function applySelectedTemplate() {
  templateOutlineController.applySelectedTemplate();
}

function openTemplateDialog() {
  templateOutlineController.openTemplateDialog();
}

function saveUserTemplateFromDialog() {
  templateOutlineController.saveUserTemplateFromDialog();
}

function openFontDialog() {
  fontManager.open();
}

function updateCurrentSlide(patch: Partial<MikroSlideRecord>, options: RenderOptions = {}) {
  deckActionsController.updateCurrentSlide(patch, options);
}

function updateSelectedElement(patch: Partial<SlideElement>, options: RenderOptions = {}) {
  deckActionsController.updateSelectedElement(patch, options);
}

function updateSelectedElementGeometry(
  updates: Array<{ id: string; patch: Partial<SlideElement> }>,
  options: RenderOptions = {},
) {
  deckActionsController.updateSelectedElementGeometry(updates, options);
}

function selectSlideById(slideId: string) {
  deckActionsController.selectSlideById(slideId);
}

function reorderSlide(
  draggedSlideIdValue: string,
  targetSlideId: string,
  placement: SlideDropPlacement,
) {
  deckActionsController.reorderSlide(draggedSlideIdValue, targetSlideId, placement);
}

function toggleSlideSkipped(slideId: string) {
  deckActionsController.toggleSlideSkipped(slideId);
}

function handleLayerListClick(event: MouseEvent) {
  deckActionsController.handleLayerListClick(event);
}

function reorderSelectedElements(action: "front" | "forward" | "backward" | "back") {
  deckActionsController.reorderSelectedElements(action);
}

async function handleDeckListClick(event: MouseEvent) {
  await deckPersistenceController.handleDeckListClick(event, elements.libraryDialog);
}

function handleCanvasClick(event: MouseEvent) {
  canvasController.handleCanvasClick(event);
}

function handleCanvasContextMenu(event: MouseEvent) {
  canvasController.handleCanvasContextMenu(event);
}

function openContextMenu(clientX: number, clientY: number) {
  slideContextMenuController.close();
  contextMenuController.open(clientX, clientY);
}

function closeContextMenu() {
  contextMenuController.close();
  slideContextMenuController.close();
}

function handleContextMenuClick(event: MouseEvent) {
  contextMenuController.handleClick(event);
}

function openSlideContextMenu(slideId: string, clientX: number, clientY: number) {
  contextMenuController.close();
  slideContextMenuController.open(slideId, clientX, clientY);
}

function handleSlideContextMenuClick(event: MouseEvent) {
  slideContextMenuController.handleClick(event);
}

function getSlideContextMenuState(slideId: string) {
  const deck = deckStateController.getDeck();
  const slideIndex = deck?.slides.findIndex((slide) => slide.id === slideId) ?? -1;
  const slide = slideIndex >= 0 ? deck?.slides[slideIndex] : null;

  return {
    hasClipboard: deckActionsController.hasSlideClipboard(),
    hasSlide: Boolean(slide),
    isFirstSlide: slideIndex <= 0,
    isLastSlide: !deck || slideIndex < 0 || slideIndex >= deck.slides.length - 1,
    isSkipped: Boolean(slide?.skipped),
  };
}

function withSlideContextSelection(slideId: string, action: () => void) {
  selectSlideById(slideId);
  action();
}

function handleCanvasDoubleClick(event: MouseEvent) {
  canvasController.handleCanvasDoubleClick(event);
}

function handleCanvasTextInput(event: Event) {
  canvasController.handleCanvasTextInput(event);
}

function handleCanvasFocusOut(event: FocusEvent) {
  canvasController.handleCanvasFocusOut(event);
}

function handleCanvasPointerDown(event: PointerEvent) {
  canvasController.handleCanvasPointerDown(event);
}

function handlePointerMove(event: PointerEvent) {
  canvasController.handlePointerMove(event);
}

function handlePointerUp(event: PointerEvent) {
  canvasController.handlePointerUp(event);
}

function handlePointerCancel(event: PointerEvent) {
  canvasController.handlePointerCancel(event);
}

function openCommandPalette() {
  commandController.open();
}

async function handleKeyboard(event: KeyboardEvent) {
  await commandController.handleKeyboard(event);
}

function openExportDialog() {
  exportController.open();
}

function exportJson() {
  exportController.exportJson();
}

async function exportPortable() {
  await exportController.exportPortable();
}

function exportPdf() {
  exportController.exportPdf();
}

async function exportPng() {
  await exportController.exportPng();
}

function openPresenter() {
  presenterController.open();
}

function movePresenter(direction: -1 | 1) {
  presenterController.move(direction);
}

async function importJsonFile(event: Event) {
  await deckPersistenceController.handleImportJsonFile(event);
}

function getActiveSlide() {
  return deckStateController.getActiveSlide();
}

function getSelectedElements() {
  return deckStateController.getSelectedElements();
}

function selectSlide() {
  selectElements([]);
}

async function persistRecoveryDraft() {
  await deckPersistenceController.persistRecoveryDraft();
}

async function loadRecoveryDraft(deckId: string) {
  return deckPersistenceController.loadRecoveryDraft(deckId);
}

function resolveImageSource(src: string) {
  return assetController.resolveImageSource(src);
}

async function syncAssetObjectUrls(deck: MikroDeckRecord | null = deckStateController.getDeck()) {
  await assetController.syncObjectUrls(deck);
}

async function createStoredImageAsset(blob: Blob, originalName: string) {
  return assetController.createStoredImageAsset(blob, originalName);
}

async function createStoredFontAsset(blob: Blob, originalName: string) {
  return assetController.createStoredFontAsset(blob, originalName);
}

function showToast(message: string) {
  toastController.show(message);
}

function applyFocusMode() {
  appChromeController.applyFocusMode();
}

function setCanvasZoom(value: number) {
  appChromeController.setCanvasZoom(value);
}

function loadUserTemplates() {
  return userTemplateStorageController.load();
}

function saveUserTemplates() {
  userTemplateStorageController.save(userTemplates);
}

function loadTheme() {
  return appChromeController.loadTheme();
}

function applyTheme(theme: string) {
  appChromeController.applyTheme(theme);
}

function toggleTheme() {
  appChromeController.toggleTheme();
}
