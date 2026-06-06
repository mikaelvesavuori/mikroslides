import {
  createTextElement,
  defaultDeckTheme,
  MikroDeck,
  type MikroDeckRecord,
} from "../../src/index.js";
import { createTemplateOutlineController } from "../../src/presentation/templateOutlineController.js";
import type { UserTemplate } from "../../src/presentation/userTemplates.js";

function input(value = "") {
  return {
    focus: () => undefined,
    select: () => undefined,
    value,
  };
}

function dialog() {
  return {
    close: () => undefined,
    open: false,
    showModal: () => undefined,
  };
}

function harness() {
  let deck = MikroDeck.create({ title: "Deck" }).toRecord();
  deck.slides[0] = {
    ...deck.slides[0],
    background: "#ffffff",
    elements: [createTextElement({ content: "Original", id: "original" })],
  };
  let userTemplates: UserTemplate[] = [
    {
      createdAt: "2026-06-04T00:00:00.000Z",
      id: "template",
      name: "Template",
      slide: {
        ...deck.slides[0],
        background: "#111111",
        elements: [createTextElement({ content: "From template", id: "template_text" })],
        title: "Template slide",
      },
    },
  ];
  const calls: string[] = [];
  const outlineInput = input();
  const templateNameInput = input("Saved template");
  const templateSelect = input();
  const controller = createTemplateOutlineController({
    clearHistory: () => calls.push("clear-history"),
    commitDeckMutation: (result) => {
      if (!result) {
        return false;
      }
      deck = "deck" in result ? result.deck : result;
      return true;
    },
    createDeckFromMarkdown: (markdown, options) =>
      ({
        ...MikroDeck.create({
          aspectRatio: options.aspectRatio,
          theme: options.theme,
          title: markdown,
        }).toRecord(),
        id: "outline",
      }) as MikroDeckRecord,
    elements: {
      outlineDialog: dialog() as unknown as HTMLDialogElement,
      outlineInput: outlineInput as unknown as HTMLTextAreaElement,
      templateDialog: dialog() as unknown as HTMLDialogElement,
      templateNameInput: templateNameInput as unknown as HTMLInputElement,
      templateSelect: templateSelect as unknown as HTMLSelectElement,
    },
    formatError: (error, fallback) => (error instanceof Error ? error.message : fallback),
    getDeck: () => deck,
    getSlide: () => deck.slides[0],
    getStorageAvailable: () => true,
    getUserTemplates: () => userTemplates,
    localStorage: {
      setItem: (key: string, value: string) => calls.push(`storage:${key}:${value}`),
    } as unknown as Storage,
    refreshLibrary: async () => {
      calls.push("refresh-library");
    },
    rememberDeck: (_storage, nextDeck) => calls.push(`remember:${nextDeck.id}`),
    renderAll: () => calls.push("render-all"),
    renderTemplateOptions: () => calls.push("render-template-options"),
    saveCurrentDeck: async () => {
      calls.push("save-current");
    },
    saveDeckRecord: async (nextDeck) => ({ ...nextDeck, title: `${nextDeck.title} saved` }),
    saveUserTemplates: () => calls.push("save-templates"),
    selectSlide: () => calls.push("select-slide"),
    setDeck: (nextDeck) => {
      deck = nextDeck;
    },
    setUserTemplates: (templates) => {
      userTemplates = templates;
    },
    showToast: (message) => calls.push(`toast:${message}`),
    syncAssetObjectUrls: async () => {
      calls.push("sync-assets");
    },
    windowRef: {
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
    getDeck: () => deck,
    getUserTemplates: () => userTemplates,
    outlineInput,
    templateNameInput,
    templateSelect,
  };
}

describe("template outline controller", () => {
  it("applies custom templates to the active slide", () => {
    const test = harness();
    test.templateSelect.value = "custom:template";

    test.controller.applySelectedTemplate();

    expect(test.getDeck().slides[0]).toMatchObject({
      background: "#111111",
      title: "Template slide",
    });
    expect(test.getDeck().slides[0].elements[0]).toMatchObject({ content: "From template" });
  });

  it("saves the active slide as a user template", () => {
    const test = harness();

    test.controller.saveUserTemplateFromDialog();

    expect(test.getUserTemplates()[0]).toMatchObject({ name: "Saved template" });
    expect(test.calls).toEqual(
      expect.arrayContaining(["save-templates", "render-template-options"]),
    );
  });

  it("validates and creates decks from outlines", async () => {
    const test = harness();

    await test.controller.createDeckFromOutlineText("   ");
    expect(test.calls).toContain("toast:Paste an outline first");

    await test.controller.createDeckFromOutlineText("# Launch");
    expect(test.getDeck()).toMatchObject({
      aspectRatio: "16:9",
      id: "outline",
      theme: defaultDeckTheme,
      title: "# Launch saved",
    });
    expect(test.calls).toEqual(
      expect.arrayContaining([
        "save-current",
        "refresh-library",
        "select-slide",
        "clear-history",
        "remember:outline",
        "sync-assets",
        "render-all",
        "toast:Deck created from outline",
      ]),
    );
  });
});
