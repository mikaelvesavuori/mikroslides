import type { MikroDeckRecord, SlideElement } from "../index.js";
import { DeckHistory } from "./deckHistory.js";
import { activeSlideForDeck, selectedElementsForDeck } from "./deckMutations.js";
import { normalizeSelection, selectionForSlide } from "./selection.js";

export type DeckStateRenderOptions = {
  history?: boolean;
  inspector?: boolean;
  library?: boolean;
};

type DeckMutationResult =
  | MikroDeckRecord
  | {
      deck: MikroDeckRecord;
      selectedElementIds?: string[];
    }
  | null;

export type DeckStateControllerOptions = {
  persistRecoveryDraft: () => Promise<void>;
  renderAll: (options?: DeckStateRenderOptions) => void;
  scheduleAutosave: () => void;
};

export function createDeckStateController(options: DeckStateControllerOptions) {
  const history = new DeckHistory();
  let activeDeck: MikroDeckRecord | null = null;
  let selectedElementIds: string[] = [];

  function selectElements(ids: string[]) {
    const slide = activeSlideForDeck(activeDeck);
    selectedElementIds = normalizeSelection(
      ids,
      slide?.elements.map((element) => element.id) ?? [],
    );
  }

  function syncSelectionToActiveSlide() {
    const slide = activeSlideForDeck(activeDeck);
    if (!slide) {
      selectElements([]);
      return;
    }

    selectElements(selectionForSlide(selectedElementIds, slide.elements));
  }

  function commitDeckChange(renderOptions: DeckStateRenderOptions = {}) {
    if (renderOptions.history !== false) {
      history.flush();
    }
    void options.persistRecoveryDraft();
    options.renderAll(renderOptions);
    options.scheduleAutosave();
  }

  return {
    clearHistory() {
      history.clear();
    },
    commitDeckMutation(result: DeckMutationResult, renderOptions: DeckStateRenderOptions = {}) {
      if (!result) {
        return false;
      }

      if (renderOptions.history !== false) {
        history.stage(activeDeck);
      }
      if ("deck" in result) {
        activeDeck = result.deck;
        if (result.selectedElementIds) {
          selectElements(result.selectedElementIds);
        }
      } else {
        activeDeck = result;
      }
      commitDeckChange(renderOptions);
      return true;
    },
    flushHistorySnapshot() {
      history.flush();
    },
    getActiveSlide() {
      return activeSlideForDeck(activeDeck);
    },
    get canRedo() {
      return history.canRedo;
    },
    get canUndo() {
      return history.canUndo;
    },
    getDeck() {
      return activeDeck;
    },
    getSelectedElementIds() {
      return selectedElementIds;
    },
    getSelectedElements(): SlideElement[] {
      return selectedElementsForDeck(activeDeck, selectedElementIds);
    },
    hasDeck() {
      return Boolean(activeDeck);
    },
    redo() {
      const next = history.redo(activeDeck);
      if (!next) {
        return;
      }

      activeDeck = next;
      syncSelectionToActiveSlide();
      options.renderAll();
      options.scheduleAutosave();
    },
    selectElements,
    selectSlide() {
      selectElements([]);
    },
    setDeck(deck: MikroDeckRecord | null) {
      activeDeck = deck;
    },
    syncSelectionToActiveSlide,
    undo() {
      const previous = history.undo(activeDeck);
      if (!previous) {
        return;
      }

      activeDeck = previous;
      syncSelectionToActiveSlide();
      options.renderAll();
      options.scheduleAutosave();
    },
    stageHistory() {
      history.stage(activeDeck);
    },
  };
}
