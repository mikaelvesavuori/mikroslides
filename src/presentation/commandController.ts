import type { MikroSlideRecord, SlideElement } from "../index.js";
import type { MikroSlidesElements } from "./appElements.js";
import { buildMikroSlidesCommandActions, type CommandTemplate } from "./commandActions.js";
import { CommandPalette } from "./commandPalette.js";
import { keyboardShortcutActionFromEvent, runKeyboardShortcutAction } from "./keyboardShortcuts.js";

export type CommandControllerElements = Pick<
  MikroSlidesElements,
  | "commandDialog"
  | "commandInput"
  | "commandList"
  | "presenterDialog"
  | "speakerNotes"
  | "templateSelect"
>;

type CommandControllerCallbacks = {
  addImage: () => void;
  addShape: () => void;
  addSlide: () => void;
  addText: () => void;
  applySelectedTemplate: () => void;
  closeContextMenu: () => void;
  closePresenter: () => void;
  copySelection: () => void;
  createDeck: () => Promise<void>;
  cutSelection: () => void;
  deleteSelection: () => void;
  deleteSlide: () => void;
  duplicateSelectedElement: () => void;
  duplicateSlide: () => void;
  exportJson: () => void;
  exportPdf: () => void;
  exportPng: () => Promise<void>;
  exportPortable: () => Promise<void>;
  movePresenter: (direction: -1 | 1) => void;
  moveSlide: (direction: -1 | 1) => void;
  openExport: () => void;
  openLibrary: () => void;
  openOutline: () => void;
  openPresenter: () => void;
  redo: () => void;
  renderCanvas: () => void;
  renderInspector: () => void;
  saveDeck: (snapshot?: boolean) => Promise<void>;
  selectElements: (ids: string[]) => void;
  showToast: (message: string) => void;
  toggleTheme: () => void;
  undo: () => void;
  updateSelectedElementGeometry: (
    updates: Array<{ id: string; patch: Partial<SlideElement> }>,
  ) => void;
};

export type CommandControllerOptions = {
  callbacks: CommandControllerCallbacks;
  contextMenuOpen: () => boolean;
  elements: CommandControllerElements;
  formatError: (error: unknown, fallback: string) => string;
  getSelectedElementIds: () => string[];
  getSelectedElements: () => SlideElement[];
  getSlide: () => MikroSlideRecord | null;
  templates: CommandTemplate[];
};

export function createCommandController(options: CommandControllerOptions) {
  function open() {
    commandPalette.open();
  }

  const commandPalette = new CommandPalette({
    dialog: options.elements.commandDialog,
    input: options.elements.commandInput,
    list: options.elements.commandList,
    getActions: () =>
      buildMikroSlidesCommandActions({
        templates: options.templates,
        callbacks: {
          addImage: options.callbacks.addImage,
          addShape: options.callbacks.addShape,
          addSlide: options.callbacks.addSlide,
          addText: options.callbacks.addText,
          applyTemplate: (templateId) => {
            options.elements.templateSelect.value = templateId;
            options.callbacks.applySelectedTemplate();
          },
          createDeck: options.callbacks.createDeck,
          deleteSlide: options.callbacks.deleteSlide,
          duplicateSlide: options.callbacks.duplicateSlide,
          exportJson: options.callbacks.exportJson,
          exportPdf: options.callbacks.exportPdf,
          exportPng: options.callbacks.exportPng,
          exportPortable: options.callbacks.exportPortable,
          focusSpeakerNotes: () => options.elements.speakerNotes.focus(),
          moveSlideDown: () => options.callbacks.moveSlide(1),
          moveSlideUp: () => options.callbacks.moveSlide(-1),
          openExport: options.callbacks.openExport,
          openLibrary: options.callbacks.openLibrary,
          openOutline: options.callbacks.openOutline,
          present: options.callbacks.openPresenter,
          redo: options.callbacks.redo,
          toggleTheme: options.callbacks.toggleTheme,
          undo: options.callbacks.undo,
        },
      }),
    onError: (error) => options.callbacks.showToast(options.formatError(error, "Command failed")),
  });

  return {
    open,
    async handleKeyboard(event: KeyboardEvent) {
      const action = keyboardShortcutActionFromEvent(event, {
        commandPaletteOpen: options.elements.commandDialog.open,
        contextMenuOpen: options.contextMenuOpen(),
        hasSelection: options.getSelectedElementIds().length > 0,
        presenterOpen: options.elements.presenterDialog.open,
      });
      if (!action) {
        return;
      }

      if (action.preventDefault) {
        event.preventDefault();
      }

      await runKeyboardShortcutAction(action, {
        closeContextMenu: options.callbacks.closeContextMenu,
        closePresenter: options.callbacks.closePresenter,
        copySelection: options.callbacks.copySelection,
        createDeck: options.callbacks.createDeck,
        cutSelection: options.callbacks.cutSelection,
        deleteSelection: options.callbacks.deleteSelection,
        duplicate: () => {
          if (options.getSelectedElementIds().length > 0) {
            options.callbacks.duplicateSelectedElement();
          } else {
            options.callbacks.duplicateSlide();
          }
        },
        exportPdf: options.callbacks.exportPdf,
        nudgeSelection: (dx, dy) =>
          options.callbacks.updateSelectedElementGeometry(
            options.getSelectedElements().map((element) => ({
              id: element.id,
              patch: {
                x: element.x + dx,
                y: element.y + dy,
              },
            })),
          ),
        openCommandPalette: open,
        openPresenter: options.callbacks.openPresenter,
        presenterNext: () => options.callbacks.movePresenter(1),
        presenterPrevious: () => options.callbacks.movePresenter(-1),
        redo: options.callbacks.redo,
        saveDeck: async () => {
          await options.callbacks.saveDeck(true);
          options.callbacks.showToast("Deck saved");
        },
        selectAllElements: () => {
          options.callbacks.selectElements(
            options.getSlide()?.elements.map((element) => element.id) ?? [],
          );
          options.callbacks.renderCanvas();
          options.callbacks.renderInspector();
        },
        undo: options.callbacks.undo,
      });
    },
  };
}
