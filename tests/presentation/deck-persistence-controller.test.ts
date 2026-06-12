import { MikroDeck, type MikroDeckRecord } from "../../src/index.js";
import {
  createDeckPersistenceController,
  type DeckPersistenceService,
} from "../../src/presentation/deckPersistenceController.js";

const originalHTMLElement = globalThis.HTMLElement;
const originalHTMLInputElement = globalThis.HTMLInputElement;

class FakeHTMLElement {
  constructor(
    private readonly action: string,
    private readonly deckId: string,
  ) {}

  closest(selector: string) {
    if (selector === "[data-deck-id]") {
      return { dataset: { deckId: this.deckId } };
    }
    if (selector === "[data-action]") {
      return { dataset: { action: this.action } };
    }
    return null;
  }
}

class FakeHTMLInputElement {
  files: Array<{ name: string }>;
  value: string;

  constructor(fileName: string | null) {
    this.files = fileName ? [{ name: fileName }] : [];
    this.value = fileName ?? "";
  }
}

beforeAll(() => {
  (globalThis as unknown as { HTMLElement: typeof FakeHTMLElement }).HTMLElement = FakeHTMLElement;
  (globalThis as unknown as { HTMLInputElement: typeof FakeHTMLInputElement }).HTMLInputElement =
    FakeHTMLInputElement;
});

afterAll(() => {
  if (originalHTMLElement) {
    globalThis.HTMLElement = originalHTMLElement;
  } else {
    Reflect.deleteProperty(globalThis, "HTMLElement");
  }
  if (originalHTMLInputElement) {
    globalThis.HTMLInputElement = originalHTMLInputElement;
  } else {
    Reflect.deleteProperty(globalThis, "HTMLInputElement");
  }
});

function makeDeck(id: string, title = id) {
  return { ...MikroDeck.create({ title }).toRecord(), id };
}

function service(overrides: Partial<DeckPersistenceService> = {}): DeckPersistenceService {
  const decks = [makeDeck("deck_a"), makeDeck("deck_b")];
  return {
    create: async ({ title }) => makeDeck("created", title),
    delete: async () => undefined,
    deleteDraft: async () => undefined,
    duplicate: async () => undefined,
    importFile: async (text) => makeDeck("imported", text),
    importJson: async (text) => makeDeck("imported", text),
    list: async () => decks,
    load: async (deckId) => decks.find((deck) => deck.id === deckId) ?? null,
    loadDraft: async (deckId) => makeDeck(deckId, "Draft"),
    save: async (deck) => ({ ...deck, title: `${deck.title} saved` }),
    saveDraft: async () => undefined,
    ...overrides,
  };
}

function storage() {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    length: 0,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  } as Storage & { values: Map<string, string> };
}

function harness(
  input: {
    activeDeck?: MikroDeckRecord | null;
    confirm?: (message: string) => boolean;
    service?: DeckPersistenceService;
    storageAvailable?: boolean;
  } = {},
) {
  let activeDeck = input.activeDeck ?? makeDeck("active", "Active");
  let libraryDecks: MikroDeckRecord[] = [];
  const calls: string[] = [];
  const store = storage();
  const controller = createDeckPersistenceController({
    clearHistory: () => calls.push("clear-history"),
    formatError: (error, fallback) => (error instanceof Error ? error.message : fallback),
    getDeck: () => activeDeck,
    getStorageAvailable: () => input.storageAvailable ?? true,
    localStorage: store,
    readFileAsText: async (file) => file.name,
    renderAll: () => calls.push("render-all"),
    renderLibrary: () => calls.push("render-library"),
    selectSlide: () => calls.push("select-slide"),
    service: input.service ?? service(),
    setDeck: (deck) => {
      activeDeck = deck;
    },
    setLibraryDecks: (decks) => {
      libraryDecks = decks;
    },
    showToast: (message) => calls.push(`toast:${message}`),
    syncAssetObjectUrls: async () => {
      calls.push("sync-assets");
    },
    windowRef: {
      clearTimeout: () => calls.push("clear-timeout"),
      confirm: input.confirm,
      setTimeout: (callback: TimerHandler) => {
        if (typeof callback === "function") {
          callback();
        }
        return 1;
      },
    } as unknown as Window,
  });

  return {
    calls,
    controller,
    getDeck: () => activeDeck,
    getLibraryDecks: () => libraryDecks,
    store,
  };
}

describe("deck persistence controller", () => {
  it("saves the active deck and refreshes library records", async () => {
    const test = harness();

    await test.controller.saveDeck(true);

    expect(test.getDeck()?.title).toBe("Active saved");
    expect(test.getLibraryDecks().map((deck) => deck.id)).toEqual(["deck_a", "deck_b"]);
    expect(test.store.values.get("mikroslides.activeDeckId")).toBe("active");
  });

  it("creates a new deck and resets session state", async () => {
    const test = harness();

    await test.controller.createDeck();

    expect(test.getDeck()?.id).toBe("created");
    expect(test.calls).toEqual(
      expect.arrayContaining(["select-slide", "clear-history", "sync-assets", "render-all"]),
    );
  });

  it("handles deck library duplicate and active delete actions", async () => {
    const test = harness({ activeDeck: makeDeck("deck_a") });
    const dialog = { close: () => test.calls.push("dialog-close") };

    await test.controller.handleDeckListClick(
      libraryEvent("duplicate-deck", "deck_a"),
      dialog as unknown as HTMLDialogElement,
    );
    expect(test.calls).toContain("toast:Deck duplicated");

    await test.controller.handleDeckListClick(
      libraryEvent("delete-deck", "deck_a"),
      dialog as unknown as HTMLDialogElement,
    );
    expect(test.getDeck()?.id).toBe("deck_b");
    expect(test.calls).toContain("toast:Deck deleted");
  });

  it("cancels deck library delete when confirmation is rejected", async () => {
    const deleted: string[] = [];
    const test = harness({
      confirm: () => false,
      service: service({
        delete: async (deckId) => {
          deleted.push(deckId);
        },
      }),
    });
    const dialog = { close: () => test.calls.push("dialog-close") };

    await test.controller.handleDeckListClick(
      libraryEvent("delete-deck", "deck_a"),
      dialog as unknown as HTMLDialogElement,
    );

    expect(deleted).toEqual([]);
    expect(test.calls).not.toContain("toast:Deck deleted");
  });

  it("persists and loads recovery drafts best-effort", async () => {
    const saved: string[] = [];
    const test = harness({
      service: service({
        saveDraft: async (deck) => {
          saved.push(deck.id);
        },
      }),
    });

    await test.controller.persistRecoveryDraft();

    expect(saved).toEqual(["active"]);
    expect(await test.controller.loadRecoveryDraft("draft")).toMatchObject({ id: "draft" });
  });

  it("imports JSON files and resets session state", async () => {
    const test = harness();
    const input = new FakeHTMLInputElement("Imported Deck");

    await test.controller.handleImportJsonFile({
      currentTarget: input,
    } as unknown as Event);

    expect(test.getDeck()).toMatchObject({ id: "imported", title: "Imported Deck" });
    expect(input.value).toBe("");
    expect(test.store.values.get("mikroslides.activeDeckId")).toBe("imported");
    expect(test.calls).toEqual(
      expect.arrayContaining([
        "select-slide",
        "clear-history",
        "sync-assets",
        "render-all",
        "toast:Deck imported",
      ]),
    );
  });
});

function libraryEvent(action: string, deckId: string) {
  return {
    target: new FakeHTMLElement(action, deckId),
  } as unknown as MouseEvent;
}
