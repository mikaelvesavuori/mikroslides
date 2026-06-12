import {
  type DeckAspectRatio,
  defaultDeckTheme,
  type MikroDeckRecord,
  type MikroSlideRecord,
  type ShapeSlideElement,
  type SlideElement,
  type SlideShapeKind,
  type TextListStyle,
  type TextSlideElement,
} from "../index.js";
import {
  addDefaultShapeElement,
  addDefaultTextElement,
  addSlideToDeck,
  alignElementsInActiveSlide,
  deleteElementsFromActiveSlide,
  duplicateActiveSlide,
  duplicateElementsInActiveSlide,
  moveActiveSlide,
  type ObjectAlignment,
  pasteSlidesAfterActiveSlide,
  removeActiveSlide,
  reorderDeckSlides,
  reorderSelectedElementsInActiveSlide,
  setActiveSlide,
  toggleSlideSkipped as toggleSlideSkippedInDeck,
  updateActiveSlide,
  updateDeckRecord,
  updateElementsInActiveSlide,
} from "./deckMutations.js";
import { builtInDeckThemes } from "./deckOptions.js";
import { rethemeSlide } from "./deckTheme.js";
import { sharedValue } from "./inspectorPanel.js";
import { isMultiSelectEvent, nextInteractionSelection } from "./selection.js";
import type { SlideDropPlacement } from "./slideReorder.js";

type RenderOptions = {
  history?: boolean;
  inspector?: boolean;
  library?: boolean;
};

export type DeckActionsControllerOptions = {
  commitDeckMutation: (
    result: MikroDeckRecord | { deck: MikroDeckRecord; selectedElementIds?: string[] } | null,
    options?: RenderOptions,
  ) => boolean;
  getDeck: () => MikroDeckRecord | null;
  getSelectedElementIds: () => string[];
  getSelectedElements: () => SlideElement[];
  getSlide: () => MikroSlideRecord | null;
  renderCanvas: () => void;
  renderInspector: () => void;
  selectElements: (ids: string[]) => void;
  showToast: (message: string) => void;
};

export function createDeckActionsController(options: DeckActionsControllerOptions) {
  let slideClipboard: { deckId: string; slides: MikroSlideRecord[] } | null = null;

  function selectedIds() {
    return options.getSelectedElementIds();
  }

  function unlockedSelectedElements() {
    return options.getSelectedElements().filter((element) => !element.locked);
  }

  function unlockedSelectedIds() {
    return unlockedSelectedElements().map((element) => element.id);
  }

  function lockPatchOnly(patch: Partial<SlideElement>) {
    const keys = Object.keys(patch);
    return keys.length === 1 && keys[0] === "locked";
  }

  function updateSelectedElementGeometry(
    updates: Array<{ id: string; patch: Partial<SlideElement> }>,
    renderOptions: RenderOptions = {},
  ) {
    const deck = options.getDeck();
    const slide = options.getSlide();
    if (!deck || !slide || updates.length === 0) {
      return;
    }

    const nextUpdates = updates.filter((update) => {
      const element = slide.elements.find((item) => item.id === update.id);
      return Boolean(element && (!element.locked || lockPatchOnly(update.patch)));
    });
    if (nextUpdates.length === 0) {
      return;
    }

    options.commitDeckMutation(updateElementsInActiveSlide(deck, nextUpdates), renderOptions);
  }

  function updateSelectedElement(patch: Partial<SlideElement>, renderOptions: RenderOptions = {}) {
    const selected = options.getSelectedElements();
    if (!options.getDeck() || selected.length === 0) {
      return;
    }

    const editable = lockPatchOnly(patch)
      ? selected
      : selected.filter((element) => !element.locked);
    updateSelectedElementGeometry(
      editable.map((element) => ({ id: element.id, patch })),
      renderOptions,
    );
  }

  function toggleSelectedTextListStyle(style: TextListStyle) {
    const textElements = options
      .getSelectedElements()
      .filter((element): element is TextSlideElement => element.kind === "text");
    if (textElements.length === 0) {
      return;
    }

    const current = sharedValue(textElements, (element) => element.listStyle);
    updateSelectedElement({ listStyle: current === style ? "none" : style });
  }

  function copySlideToClipboard(toastMessage: string) {
    const deck = options.getDeck();
    const slide = options.getSlide();
    if (!deck || !slide) {
      return false;
    }

    slideClipboard = { deckId: deck.id, slides: [structuredClone(slide)] };
    options.showToast(toastMessage);
    return true;
  }

  function copySlide() {
    copySlideToClipboard("Slide copied");
  }

  function deleteSlide() {
    const deck = options.getDeck();
    if (deck) {
      options.commitDeckMutation({ deck: removeActiveSlide(deck), selectedElementIds: [] });
    }
  }

  function cutSlide() {
    const slide = options.getSlide();
    if (!slide) {
      return;
    }

    if (copySlideToClipboard("Slide cut")) {
      deleteSlide();
    }
  }

  function pasteSlide() {
    const deck = options.getDeck();
    if (!deck || !slideClipboard || slideClipboard.slides.length === 0) {
      return;
    }

    if (slideClipboard.deckId !== deck.id) {
      options.showToast("Copy a slide from this deck first");
      return;
    }

    options.commitDeckMutation(pasteSlidesAfterActiveSlide(deck, slideClipboard.slides));
  }

  function hasSlideClipboard() {
    const deck = options.getDeck();
    return Boolean(deck && slideClipboard?.deckId === deck.id && slideClipboard.slides.length > 0);
  }

  return {
    addShapeElement(shape: SlideShapeKind = "rect", patch: Partial<ShapeSlideElement> = {}) {
      const deck = options.getDeck();
      if (deck) {
        options.commitDeckMutation(addDefaultShapeElement(deck, shape, patch));
      }
    },
    addSlide() {
      const deck = options.getDeck();
      if (deck) {
        options.commitDeckMutation({ deck: addSlideToDeck(deck), selectedElementIds: [] });
      }
    },
    addTextElement() {
      const deck = options.getDeck();
      if (deck) {
        options.commitDeckMutation(addDefaultTextElement(deck));
      }
    },
    alignSelectedElements(alignment: ObjectAlignment) {
      const deck = options.getDeck();
      const ids = unlockedSelectedIds();
      if (!deck || ids.length === 0) {
        return;
      }

      const nextDeck = alignElementsInActiveSlide(deck, ids, alignment);
      if (nextDeck) {
        options.commitDeckMutation({ deck: nextDeck, selectedElementIds: selectedIds() });
      }
    },
    deleteSelectedElement() {
      const deck = options.getDeck();
      const ids = unlockedSelectedIds();
      if (!deck || ids.length === 0) {
        return;
      }

      options.commitDeckMutation(deleteElementsFromActiveSlide(deck, ids));
    },
    copySlide,
    cutSlide,
    deleteSlide,
    duplicateSelectedElement() {
      const deck = options.getDeck();
      const ids = unlockedSelectedIds();
      if (!deck || ids.length === 0) {
        return;
      }

      options.commitDeckMutation(duplicateElementsInActiveSlide(deck, ids));
    },
    duplicateSlide() {
      const deck = options.getDeck();
      if (deck) {
        options.commitDeckMutation({ deck: duplicateActiveSlide(deck), selectedElementIds: [] });
      }
    },
    hasSlideClipboard,
    pasteSlide,
    handleLayerListClick(event: MouseEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const button = target?.closest<HTMLButtonElement>("[data-layer-id]");
      const layerId = button?.dataset.layerId;
      if (!layerId) {
        return;
      }

      options.selectElements(
        nextInteractionSelection(selectedIds(), layerId, isMultiSelectEvent(event)),
      );
      options.renderCanvas();
      options.renderInspector();
    },
    moveSlide(direction: -1 | 1) {
      const deck = options.getDeck();
      if (deck) {
        options.commitDeckMutation(moveActiveSlide(deck, direction));
      }
    },
    reorderSelectedElements(action: "back" | "backward" | "forward" | "front") {
      const deck = options.getDeck();
      const ids = unlockedSelectedIds();
      if (!deck || ids.length === 0) {
        return;
      }

      const nextDeck = reorderSelectedElementsInActiveSlide(deck, ids, action);
      if (nextDeck) {
        options.commitDeckMutation({ deck: nextDeck, selectedElementIds: selectedIds() });
      }
    },
    reorderSlide(
      draggedSlideIdValue: string,
      targetSlideId: string,
      placement: SlideDropPlacement,
    ) {
      const deck = options.getDeck();
      if (!deck || draggedSlideIdValue === targetSlideId) {
        return;
      }

      const nextDeck = reorderDeckSlides(deck, draggedSlideIdValue, targetSlideId, placement);
      if (nextDeck) {
        options.commitDeckMutation({ deck: nextDeck, selectedElementIds: [] });
      }
    },
    selectSlideById(slideId: string) {
      const deck = options.getDeck();
      if (deck) {
        options.commitDeckMutation({ deck: setActiveSlide(deck, slideId), selectedElementIds: [] });
      }
    },
    toggleSlideSkipped(slideId: string) {
      const deck = options.getDeck();
      if (deck) {
        options.commitDeckMutation(toggleSlideSkippedInDeck(deck, slideId), { inspector: false });
      }
    },
    toggleSelectedTextListStyle,
    updateCurrentSlide(patch: Partial<MikroSlideRecord>, renderOptions: RenderOptions = {}) {
      const deck = options.getDeck();
      const slide = options.getSlide();
      if (!deck || !slide) {
        return;
      }

      options.commitDeckMutation(updateActiveSlide(deck, patch), renderOptions);
    },
    updateDeckAspect(aspectRatio: DeckAspectRatio) {
      const deck = options.getDeck();
      if (deck) {
        options.commitDeckMutation(updateDeckRecord(deck, { aspectRatio }));
      }
    },
    updateDeckTheme(themeId: string) {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      const theme = builtInDeckThemes.find((item) => item.id === themeId) ?? defaultDeckTheme;
      const previousTheme = deck.theme;
      options.commitDeckMutation(
        updateDeckRecord(deck, {
          theme,
          slides: deck.slides.map((slide) => rethemeSlide(slide, previousTheme, theme)),
        }),
      );
    },
    updateDeckTitle(title: string) {
      const deck = options.getDeck();
      if (deck) {
        options.commitDeckMutation(updateDeckRecord(deck, { title }), { inspector: false });
      }
    },
    updateSelectedElement,
    updateSelectedElementGeometry,
  };
}
