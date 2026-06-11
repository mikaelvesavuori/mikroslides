import type { MikroDeckRecord } from "../index.js";
import { readImportFileFromEvent } from "./deckFileFlows.js";
import { deckLibraryActionFromEvent } from "./deckLibrary.js";
import { autosaveDelayMs, nextActiveDeckAfterDelete, rememberActiveDeckId } from "./deckSession.js";

type SaveDeckOptions = {
  saveSnapshot: boolean;
  snapshotReason?: "manual" | "autosave" | "import";
};

export type DeckPersistenceService = {
  create: (input: { title: string }) => Promise<MikroDeckRecord>;
  delete: (deckId: string) => Promise<void>;
  deleteDraft: (deckId: string) => Promise<void>;
  duplicate: (deckId: string) => Promise<unknown>;
  importFile: (text: string, sourceName?: string) => Promise<MikroDeckRecord>;
  importJson: (text: string) => Promise<MikroDeckRecord>;
  list: () => Promise<MikroDeckRecord[]>;
  load: (deckId: string) => Promise<MikroDeckRecord | null>;
  loadDraft: (deckId: string) => Promise<MikroDeckRecord | null>;
  save: (deck: MikroDeckRecord, options: SaveDeckOptions) => Promise<MikroDeckRecord>;
  saveDraft: (deck: MikroDeckRecord) => Promise<void>;
};

export type DeckPersistenceControllerOptions = {
  clearHistory: () => void;
  formatError: (error: unknown, fallback: string) => string;
  getDeck: () => MikroDeckRecord | null;
  getStorageAvailable: () => boolean;
  localStorage: Storage;
  readFileAsText: (file: File) => Promise<string>;
  renderAll: () => void;
  renderLibrary: () => void;
  selectSlide: () => void;
  service: DeckPersistenceService;
  setDeck: (deck: MikroDeckRecord) => void;
  setLibraryDecks: (decks: MikroDeckRecord[]) => void;
  showToast: (message: string) => void;
  syncAssetObjectUrls: () => Promise<void>;
  windowRef: Pick<Window, "clearTimeout" | "setTimeout">;
};

export function createDeckPersistenceController(options: DeckPersistenceControllerOptions) {
  let autosaveTimer: number | null = null;
  let draftSavePromise: Promise<void> | null = null;

  async function refreshLibrary(refreshOptions: { render?: boolean } = {}) {
    if (!options.getStorageAvailable()) {
      return;
    }

    const decks = await options.service.list();
    options.setLibraryDecks(decks);
    if (refreshOptions.render !== false) {
      options.renderLibrary();
    }
  }

  async function saveDeck(snapshot = false) {
    const deck = options.getDeck();
    if (!deck || !options.getStorageAvailable()) {
      return;
    }

    if (autosaveTimer) {
      options.windowRef.clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }

    try {
      if (draftSavePromise) {
        await draftSavePromise;
      }

      const savedDeck = await options.service.save(deck, {
        saveSnapshot: snapshot,
        snapshotReason: snapshot ? "manual" : undefined,
      });
      options.setDeck(savedDeck);
      rememberActiveDeckId(options.localStorage, savedDeck);
      await options.service.deleteDraft(savedDeck.id);
      await refreshLibrary({ render: false });
    } catch (error) {
      options.showToast(options.formatError(error, "Could not save deck"));
    }
  }

  function scheduleAutosave() {
    if (!options.getStorageAvailable()) {
      return;
    }

    if (autosaveTimer) {
      options.windowRef.clearTimeout(autosaveTimer);
    }

    autosaveTimer = options.windowRef.setTimeout(() => void saveDeck(false), autosaveDelayMs);
  }

  async function createDeck() {
    await saveDeck(false);
    try {
      const deck = await options.service.create({ title: "Untitled Deck" });
      options.setDeck(deck);
      options.selectSlide();
      options.clearHistory();
      rememberActiveDeckId(options.localStorage, deck);
      await refreshLibrary({ render: false });
      await options.syncAssetObjectUrls();
      options.renderAll();
    } catch (error) {
      options.showToast(options.formatError(error, "Could not create deck"));
    }
  }

  async function openDeck(deckId: string) {
    await saveDeck(false);
    const deck = await options.service.load(deckId);
    if (!deck) {
      options.showToast("Deck not found");
      return;
    }

    options.setDeck(deck);
    options.selectSlide();
    options.clearHistory();
    rememberActiveDeckId(options.localStorage, deck);
    await options.syncAssetObjectUrls();
    options.renderAll();
  }

  return {
    async createDeck() {
      await createDeck();
    },
    async handleDeckListClick(event: MouseEvent, libraryDialog: HTMLDialogElement) {
      const libraryAction = deckLibraryActionFromEvent(event);
      if (!libraryAction) {
        return;
      }

      const { action, deckId } = libraryAction;
      if (action === "open-deck") {
        await openDeck(deckId);
        libraryDialog.close();
        return;
      }

      if (action === "duplicate-deck") {
        await options.service.duplicate(deckId);
        await refreshLibrary();
        options.showToast("Deck duplicated");
        return;
      }

      if (action === "delete-deck") {
        await options.service.delete(deckId);
        const decksAfterDelete = await options.service.list();
        const activeDeck = options.getDeck();
        const replacement = nextActiveDeckAfterDelete(
          decksAfterDelete,
          deckId,
          activeDeck?.id ?? null,
        );
        if (replacement || activeDeck?.id === deckId) {
          const nextDeck =
            replacement ?? (await options.service.create({ title: "Untitled Deck" }));
          options.setDeck(nextDeck);
          options.selectSlide();
          options.clearHistory();
          rememberActiveDeckId(options.localStorage, nextDeck);
          await options.syncAssetObjectUrls();
          options.renderAll();
        }
        await refreshLibrary();
        options.showToast("Deck deleted");
      }
    },
    async handleImportJsonFile(event: Event) {
      const importFile = await readImportFileFromEvent(event, options.readFileAsText);
      if (!importFile) {
        return;
      }

      if (!importFile.text) {
        importFile.input.value = "";
        return;
      }

      try {
        const importedDeck = await options.service.importFile(
          importFile.text,
          importFile.fileName,
        );
        options.setDeck(importedDeck);
        options.selectSlide();
        options.clearHistory();
        rememberActiveDeckId(options.localStorage, importedDeck);
        await refreshLibrary({ render: false });
        await options.syncAssetObjectUrls();
        options.renderAll();
        options.showToast("Deck imported");
      } catch (error) {
        options.showToast(options.formatError(error, "Could not import deck"));
      } finally {
        importFile.input.value = "";
      }
    },
    async loadRecoveryDraft(deckId: string) {
      if (!options.getStorageAvailable()) {
        return null;
      }

      try {
        return await options.service.loadDraft(deckId);
      } catch {
        return null;
      }
    },
    async openDeck(deckId: string) {
      await openDeck(deckId);
    },
    async persistRecoveryDraft() {
      const deck = options.getDeck();
      if (!deck || !options.getStorageAvailable()) {
        return;
      }

      const nextDraftSave = options.service.saveDraft(deck);
      draftSavePromise = nextDraftSave;
      try {
        await nextDraftSave;
      } catch {
        // Recovery is best-effort and should never block editing.
      } finally {
        if (draftSavePromise === nextDraftSave) {
          draftSavePromise = null;
        }
      }
    },
    refreshLibrary,
    saveDeck,
    scheduleAutosave,
  };
}
