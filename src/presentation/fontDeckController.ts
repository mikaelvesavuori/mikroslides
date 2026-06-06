import type { MikroDeckRecord, MikroFontRecord, SlideElement, TextFontFamily } from "../index.js";
import { createId, nowIso } from "../shared/index.js";
import { fontAssetMediaType } from "./assetRuntime.js";
import {
  createBunnyFontRecord,
  createLocalFontRecord,
  createSourceFontRecord,
  findExistingBunnyFont,
  findExistingSourceFont,
} from "./deckFonts.js";
import {
  addFontToDeckRecord,
  applyFontToSelectedText,
  removeFontFromDeck,
} from "./deckMutations.js";
import type { SourceFontChoice } from "./fontCatalog.js";
import { sharedValue } from "./inspectorPanel.js";

type RenderOptions = {
  history?: boolean;
  render?: boolean;
};

export type FontDeckControllerOptions = {
  commitDeckMutation: (
    result: MikroDeckRecord | { deck: MikroDeckRecord; selectedElementIds?: string[] } | null,
    options?: RenderOptions,
  ) => boolean;
  createStoredFontAsset: (blob: Blob, originalName: string) => Promise<string>;
  deleteAsset: (assetId: string) => Promise<void>;
  deleteObjectUrl: (assetId: string) => void;
  getDeck: () => MikroDeckRecord | null;
  getSelectedElementIds: () => string[];
  getSelectedElements: () => SlideElement[];
  setDeck: (deck: MikroDeckRecord) => void;
  showToast: (message: string) => void;
};

export function createFontDeckController(options: FontDeckControllerOptions) {
  function selectedTextElements() {
    return options
      .getSelectedElements()
      .filter(
        (element): element is Extract<SlideElement, { kind: "text" }> => element.kind === "text",
      );
  }

  function selectedTextElementCount() {
    return selectedTextElements().length;
  }

  function applyFontTokenToSelectedText(
    fontFamily: TextFontFamily,
    renderOptions: RenderOptions = {},
  ) {
    const deck = options.getDeck();
    if (!deck) {
      return false;
    }

    const nextDeck = applyFontToSelectedText(deck, options.getSelectedElementIds(), fontFamily);
    if (!nextDeck) {
      return false;
    }

    if (renderOptions.render !== false) {
      options.commitDeckMutation(nextDeck, renderOptions);
    } else {
      options.setDeck(nextDeck);
    }

    return true;
  }

  function addFontToDeck(font: MikroFontRecord, applyToSelection: boolean) {
    const deck = options.getDeck();
    if (!deck) {
      return;
    }

    let nextDeck = addFontToDeckRecord(deck, font);
    if (applyToSelection) {
      nextDeck =
        applyFontToSelectedText(nextDeck, options.getSelectedElementIds(), `font:${font.id}`) ??
        nextDeck;
    }
    options.commitDeckMutation(nextDeck);
  }

  return {
    addBunnyFontFamily(family: string) {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      const label = family.trim();
      if (!label) {
        return;
      }

      const existing = findExistingBunnyFont(deck.fonts, label);
      if (existing) {
        const applied = applyFontTokenToSelectedText(`font:${existing.id}`);
        options.showToast(applied ? "Font applied" : "Font is in the deck");
        return;
      }

      const font = createBunnyFontRecord({
        createFontId: () => createId("font"),
        family: label,
        now: nowIso(),
      });
      const shouldApply = selectedTextElementCount() > 0;
      addFontToDeck(font, shouldApply);
      options.showToast(shouldApply ? "Bunny font added and applied" : "Bunny font added");
    },
    addFontToDeck,
    addSourceFont(sourceFont: SourceFontChoice) {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      const existing = findExistingSourceFont(deck.fonts, sourceFont);
      if (existing) {
        const applied = applyFontTokenToSelectedText(`font:${existing.id}`);
        options.showToast(applied ? "Font applied" : "Font is in the deck");
        return;
      }

      const font = createSourceFontRecord({
        createFontId: () => createId("font"),
        now: nowIso(),
        sourceFont,
      });
      const shouldApply = selectedTextElementCount() > 0;
      addFontToDeck(font, shouldApply);
      options.showToast(shouldApply ? "Source font added and applied" : "Source font added");
    },
    applyFontTokenToSelectedText,
    deleteDeckFont(fontId: string) {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      const result = removeFontFromDeck(deck, fontId);
      if (!result) {
        return;
      }

      if (result.font.assetId) {
        options.deleteObjectUrl(result.font.assetId);
        void options.deleteAsset(result.font.assetId);
      }

      options.commitDeckMutation(result.deck);
      options.showToast("Font removed");
    },
    async importLocalFont(file: File, label: string) {
      const deck = options.getDeck();
      if (!deck) {
        return;
      }

      const assetId = await options.createStoredFontAsset(file, file.name);
      const font = createLocalFontRecord({
        assetId,
        createFontId: () => createId("font"),
        label,
        mediaType: fontAssetMediaType(file, file.name),
        now: nowIso(),
      });
      addFontToDeck(font, true);
    },
    selectedTextElementCount,
    selectedTextFontFamily() {
      return sharedValue(selectedTextElements(), (element) => element.fontFamily);
    },
  };
}
